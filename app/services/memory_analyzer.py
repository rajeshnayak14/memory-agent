import logging

from langchain.chat_models import init_chat_model
from pydantic import BaseModel, Field

from app.services.memory_store import search_all_memories

logger = logging.getLogger(__name__)


class MemorySuggestion(BaseModel):
    """Structured output of the memory analyzer. This model is returned to
    the frontend as-is (see chat_routes.ChatResponse.memory_suggestion) — it
    never touches the memory store itself. Saving only ever happens through
    the existing POST /memories endpoint, triggered by the user's own
    explicit "Yes" click.
    """

    should_suggest: bool = Field(
        description=(
            "True only if the CURRENT message (read together with the "
            "recent turns) reveals a stable, long-term-worthy fact, "
            "preference, or goal about the user that is not already "
            "covered by an existing memory."
        )
    )
    memory: str | None = Field(
        default=None,
        description=(
            "The proposed memory, phrased as a short standalone third-person "
            "fact (e.g. 'User prefers vegetarian meals.'). Required when "
            "should_suggest is true, otherwise null."
        ),
    )
    message: str | None = Field(
        default=None,
        description=(
            "A short, natural, first-person question asking the user "
            "whether they'd like this remembered for future conversations. "
            "Required when should_suggest is true, otherwise null."
        ),
    )


# A separate, dedicated model instance with NO tools bound to it. This is
# the actual enforcement of the "analyzer must never save to global memory"
# requirement: there is no manage_memory tool anywhere on this code path, so
# there is no way for this call to write anything, regardless of what the
# model outputs. The only thing that comes out of analyze_for_memory_
# suggestion() is a plain MemorySuggestion value — a suggestion, not an
# action.
_analyzer_model = init_chat_model(
    "google_genai:gemini-2.5-flash",
).with_structured_output(MemorySuggestion)


_PROMPT_TEMPLATE = """
You are the memory analyzer for Mnemos, a personal finance assistant.

Your only job is to decide whether the user's CURRENT message, read together
with the recent conversation, contains something worth offering to save as a
long-term memory. You do not save anything yourself — you only produce a
suggestion that a human will explicitly approve or reject.

SUGGEST (should_suggest = true) when the CURRENT message itself states a
stable preference, goal, or fact as a settled, current, confident statement
about the user — judge this on content, not on how many turns have passed.
A message can qualify the very first time it appears in the conversation if
it is already stated as settled. Examples of that settled form:
- "I prefer vegetarian food"
- "I'm trying to save for a house"
- Important personal facts (e.g. name, occupation, family details)

DO NOT SUGGEST (should_suggest = false) for:
- One-time expenses or purchases
- What the user ate/did/spent today, or any single-occurrence event
- Temporary tasks, plans, or reminders
- Calculations, totals, or numeric results
- Questions the user is asking
- Anything the ASSISTANT said, not the user
- Casual, throwaway remarks with no lasting relevance
- Expense amounts, budget amounts, or savings-goal amounts/progress — these
  are already tracked precisely by the app's own expense/budget/goal
  features, so never propose them as a memory even when the user just set
  or changed one (e.g. "set my monthly budget to 20000" is not a memory)
- A tentative intention or a recent/short-term observation that has NOT yet
  been stated as a settled preference (e.g. "I want to start eating
  healthier", "I've been avoiding meat recently") — these are build-up, not
  a conclusion. This is about the WORDING of this specific message, not its
  position in the conversation: the very next message in the same
  conversation may well cross into "settled" and should suggest at that
  point, and a completely different first message that is ALREADY settled
  (e.g. "I'm vegetarian" as the very first thing the user ever says) should
  suggest immediately, with no need to wait for more turns.

Worked example — across the sequence "I want to start eating healthier" ->
"I've been avoiding meat recently" -> "I think I prefer vegetarian meals
now": should_suggest is false for the first two (still build-up wording),
and true on the third, once it's phrased as settled ("I prefer... now").
Do not suggest repeatedly for the same still-forming idea — suggest once,
when it is actually stated as settled, whichever turn that happens to be.

The user may ALSO explicitly ask to be remembered ("remember that...",
"save this to memory") — that request is already handled by a separate,
existing mechanism before you ever see this message. Do not suggest saving
something that has already been captured: check the EXISTING MEMORIES list
below, and if the current message merely restates something already there,
should_suggest must be false. If the message clearly UPDATES or CHANGES an
existing memory (e.g. existing memory says "prefers vegetarian food", new
message says "I've started eating chicken occasionally now"), you may
suggest an updated memory.

EXISTING MEMORIES (do not duplicate these):
{existing_memories}

RECENT CONVERSATION (oldest first, for context only — the fact must come
from the user, not be inferred solely from the assistant):
{recent_turns}

CURRENT USER MESSAGE:
{current_message}

CURRENT ASSISTANT REPLY (context only):
{current_reply}

Decide should_suggest, and if true, fill in memory and message. If false,
leave memory and message null.
""".strip()


def _format_existing_memories(memories: list[str]) -> str:
    if not memories:
        return "(none)"

    return "\n".join(f"- {content}" for content in memories if content)


def _format_recent_turns(previous_turns: list[dict]) -> str:
    if not previous_turns:
        return "(no earlier turns in this conversation)"

    lines = []

    for turn in previous_turns:
        if turn.get("user"):
            lines.append(f"User: {turn['user']}")
        if turn.get("assistant"):
            lines.append(f"Assistant: {turn['assistant']}")

    return "\n".join(lines) if lines else "(no earlier turns in this conversation)"


def analyze_for_memory_suggestion(
    user_id: str,
    previous_turns: list[dict],
    current_message: str,
    current_reply: str = "",
) -> MemorySuggestion | None:
    """Look at the current message plus ~2-3 prior turns and decide whether
    to suggest saving something to global memory. Never writes anything —
    read-only against the memory store, and returns a plain value for the
    caller (chat_routes.py) to hand to the frontend.

    Best-effort: any failure here (model error, malformed output, store
    lookup failure) must never break the chat response, so every failure
    path returns None rather than raising.
    """
    try:
        existing = search_all_memories(user_id)
        existing_contents = [
            memory.value.get("content", "")
            for memory in existing
            if memory.value.get("content")
        ]
    except Exception:
        logger.exception("Memory analyzer: failed to load existing memories, user_id=%s", user_id)
        existing_contents = []

    prompt = _PROMPT_TEMPLATE.format(
        existing_memories=_format_existing_memories(existing_contents),
        recent_turns=_format_recent_turns(previous_turns),
        current_message=current_message,
        current_reply=current_reply or "(none)",
    )

    try:
        result = _analyzer_model.invoke(prompt)
    except Exception:
        logger.exception("Memory analyzer: model call failed, user_id=%s", user_id)
        return None

    if not isinstance(result, MemorySuggestion):
        return None

    if not result.should_suggest or not result.memory or not result.message:
        return None

    return result
