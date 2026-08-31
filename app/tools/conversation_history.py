from datetime import datetime, timedelta, timezone

from langchain_core.tools import tool
from langgraph.config import get_config

from app.agent_resources import checkpointer
from app.database import SessionLocal
from app.model import Conversation


def resolve_date(date: str):
    today = datetime.now(timezone.utc).date()
    value = date.strip().lower()

    if value == "today":
        return today

    if value == "yesterday":
        return today - timedelta(days=1)

    for fmt in ("%Y-%m-%d", "%B %d", "%b %d"):
        try:
            parsed = datetime.strptime(value, fmt).date()

            if fmt != "%Y-%m-%d":
                parsed = parsed.replace(year=today.year)

            return parsed
        except ValueError:
            continue

    return None


@tool
def search_conversation_history(date: str) -> str:
    """
    Search the user's conversation history for a specific date.

    Accepts dates such as:
    - today
    - yesterday
    - August 20
    - Aug 20
    - 2026-08-20
    """

    config = get_config()

    configurable = config.get("configurable", {})

    user_id = configurable.get("user_id")

    if not user_id:
        return "Unable to determine the current user."

    target_date = resolve_date(date)

    if not target_date:
        return (
            "Invalid date. Please provide a date such as "
            "'August 20' or '2026-08-20'."
        )

    start = datetime.combine(
        target_date,
        datetime.min.time(),
        tzinfo=timezone.utc,
    )

    end = start + timedelta(days=1)

    db = SessionLocal()

    try:
        conversations = (
            db.query(Conversation)
            .filter(
                Conversation.user_id == int(user_id)
            )
            .all()
        )

        if not conversations:
            return (
                f"No conversations were found for "
                f"{target_date.isoformat()}."
            )

        results = []

        for conversation in conversations:
            checkpoints = checkpointer.list(
                {
                    "configurable": {
                        "thread_id": conversation.thread_id,
                    }
                },
                limit=100,
            )

            for checkpoint in checkpoints:
                checkpoint_data = checkpoint.checkpoint

                timestamp = checkpoint_data.get("ts")

                if not timestamp:
                    continue

                checkpoint_time = datetime.fromisoformat(
                    timestamp.replace("Z", "+00:00")
                )

                if not (
                    start <= checkpoint_time < end
                ):
                    continue

                channel_values = checkpoint_data.get(
                    "channel_values",
                    {}
                )

                raw_messages = channel_values.get(
                    "messages",
                    []
                )

                for message in raw_messages:
                    if message.type not in ("human", "ai"):
                        continue

                    if (
                        message.type == "ai"
                        and getattr(
                            message,
                            "tool_calls",
                            None,
                        )
                    ):
                        continue

                    content = message.content

                    if isinstance(content, list):
                        content = " ".join(
                            item.get("text", "")
                            for item in content
                            if isinstance(item, dict)
                            and item.get("text")
                        )

                    content = str(content).strip()

                    if not content:
                        continue

                    role = (
                        "User"
                        if message.type == "human"
                        else "Mnemos"
                    )

                    results.append(
                        f"{role}: {content}"
                    )

        if not results:
            return (
                f"No conversation messages were found "
                f"for {target_date.isoformat()}."
            )

        return "\n".join(results)

    finally:
        db.close()