import { useEffect, useRef, useState } from "react";
import {
  MessageSquare,
  Send,
  SquarePen,
} from "lucide-react";

import { useAuth } from "../context/AuthContext";
import { sendChatMessage } from "../api/chat";
import { getConversation } from "../api/conversations";
import {
  getOrCreateThreadId,
  resetThreadId,
} from "../utils/thread";
import { getErrorMessage } from "../utils/errorMessage";

import ChatMessageRow from "../components/ChatMessageRow";
import ChatSidePanel from "../components/ChatSidePanel";
import EmptyState from "../components/EmptyState";
import Button from "../components/Button";

import { useSearchParams } from "react-router-dom";


function nowLabel() {
  return new Date().toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}


function loadHistory(threadId) {
  try {
    const raw = localStorage.getItem(
      `recall.chat.${threadId}`
    );

    if (!raw) return [];

    const parsed = JSON.parse(raw);

    return parsed.map((m) =>
      m.status === "sending"
        ? { ...m, status: "error" }
        : m
    );
  } catch {
    return [];
  }
}


function normalizeHistory(messages) {
  return messages.map((message) => ({
    id: crypto.randomUUID(),
    role: message.role,
    content: message.content,
    status: "sent",
    time: nowLabel(),
  }));
}


export default function Chat() {
  const { user } = useAuth();

  const [searchParams, setSearchParams] =
    useSearchParams();

  const urlThreadId =
    searchParams.get("thread_id");

  const isNewChat =
    searchParams.get("new") === "1";

  const initialThreadId =
    urlThreadId
      ? urlThreadId
      : isNewChat
        ? crypto.randomUUID()
        : getOrCreateThreadId(user.id);

  const [threadId, setThreadId] =
    useState(initialThreadId);

  const [messages, setMessages] = useState(() =>
    loadHistory(initialThreadId)
  );

  const [loadingHistory, setLoadingHistory] =
    useState(Boolean(urlThreadId));

  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  const bottomRef = useRef(null);
  const textareaRef = useRef(null);


  /*
   * Load conversation from backend.
   */
  useEffect(() => {
    if (isNewChat && !urlThreadId) {
      const newThreadId =
        resetThreadId(user.id);

      setThreadId(newThreadId);
      setMessages([]);
      setInput("");
      setLoadingHistory(false);

      setSearchParams({}, { replace: true });

      return;
    }

    if (!urlThreadId) {
      setLoadingHistory(false);
      return;
    }

    let cancelled = false;

    setThreadId(urlThreadId);
    setMessages([]);
    setInput("");
    setLoadingHistory(true);

    getConversation(urlThreadId)
      .then((data) => {
        if (cancelled) return;

        setMessages(
          normalizeHistory(
            data.messages || []
          )
        );
      })
      .catch((err) => {
        if (cancelled) return;

        console.error(
          "Could not load conversation history:",
          err
        );

        /*
         * Only use local cache if the backend
         * request genuinely failed.
         */
        setMessages(
          loadHistory(urlThreadId)
        );
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingHistory(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    urlThreadId,
    isNewChat,
    user.id,
    setSearchParams,
  ]);


  /*
   * Save local cache.
   */
  useEffect(() => {
    if (!threadId || loadingHistory) {
      return;
    }

    localStorage.setItem(
      `recall.chat.${threadId}`,
      JSON.stringify(messages)
    );
  }, [
    messages,
    threadId,
    loadingHistory,
  ]);


  /*
   * Scroll to bottom.
   */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [messages.length]);


  /*
   * Handle deleted conversation.
   */
  useEffect(() => {
    const handleConversationDeleted = (
      event
    ) => {
      const deletedThreadId =
        event.detail?.threadId;

      if (!deletedThreadId) {
        return;
      }

      /*
       * Ignore deletion of another chat.
       */
      if (
        deletedThreadId !== threadId
      ) {
        return;
      }

      /*
       * Remove deleted conversation
       * from browser cache.
       */
      localStorage.removeItem(
        `recall.chat.${deletedThreadId}`
      );

      /*
       * Create a completely fresh thread.
       */
      const newThreadId =
        crypto.randomUUID();

      /*
       * Reset UI immediately.
       */
      setMessages([]);
      setInput("");
      setSending(false);
      setLoadingHistory(false);
      setThreadId(newThreadId);

      /*
       * Remove old thread from URL.
       */
      setSearchParams(
        {
          new: "1",
        },
        {
          replace: true,
        }
      );
    };

    window.addEventListener(
      "mnemos:conversation-deleted",
      handleConversationDeleted
    );

    return () => {
      window.removeEventListener(
        "mnemos:conversation-deleted",
        handleConversationDeleted
      );
    };
  }, [
    threadId,
    setSearchParams,
  ]);


  /*
   * Send message.
   */
  const deliver = async (
    userMessage,
    activeThreadId = threadId
  ) => {
    setSending(true);

    try {
      const { response, card } =
        await sendChatMessage({
          threadId: activeThreadId,
          message: userMessage.content,
        });

      setMessages((prev) => [
        ...prev.map((m) =>
          m.id === userMessage.id
            ? {
                ...m,
                status: "sent",
              }
            : m
        ),
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: response,
          card: card || null,
          status: "sent",
          time: nowLabel(),
        },
      ]);

      window.dispatchEvent(
        new Event(
          "mnemos:conversation-updated"
        )
      );
    } catch (err) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === userMessage.id
            ? {
                ...m,
                status: "error",
                errorText:
                  getErrorMessage(
                    err,
                    "Could not reach the agent."
                  ),
              }
            : m
        )
      );
    } finally {
      setSending(false);
    }
  };


  /*
   * Send.
   */
  const handleSend = () => {
    const content = input.trim();

    if (
      !content ||
      sending ||
      loadingHistory
    ) {
      return;
    }

    const userMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content,
      status: "sending",
      time: nowLabel(),
    };

    setMessages((prev) => [
      ...prev,
      userMessage,
    ]);

    setInput("");

    if (textareaRef.current) {
      textareaRef.current.style.height =
        "auto";
    }

    deliver(userMessage);
  };


  /*
   * Retry.
   */
  const handleRetry = (message) => {
    if (
      sending ||
      loadingHistory
    ) {
      return;
    }

    const newThreadId =
      crypto.randomUUID();

    setThreadId(newThreadId);

    setMessages((prev) =>
      prev.map((m) =>
        m.id === message.id
          ? {
              ...m,
              status: "sending",
            }
          : m
      )
    );

    deliver(
      message,
      newThreadId
    );
  };


  /*
   * Keyboard handling.
   */
  const handleKeyDown = (event) => {
    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {
      event.preventDefault();
      handleSend();
    }
  };


  /*
   * New conversation.
   */
  const handleNewConversation = () => {
    if (sending) return;

    const newThreadId =
      resetThreadId(user.id);

    setThreadId(newThreadId);
    setMessages([]);
    setInput("");
    setLoadingHistory(false);

    setSearchParams(
      {},
      {
        replace: true,
      }
    );
  };


  /*
   * Textarea.
   */
  const autoGrow = (event) => {
    setInput(event.target.value);

    event.target.style.height =
      "auto";

    event.target.style.height =
      `${Math.min(
        event.target.scrollHeight,
        180
      )}px`;
  };


  const firstName =
    user?.username?.split(" ")[0] ||
    "there";


  return (
    <div className="flex h-screen min-h-0 bg-page text-primary">

      <div className="flex min-h-0 flex-1 flex-col">

        <header className="flex shrink-0 items-center justify-between border-b border-border bg-surface px-6 py-3.5 sm:px-10">

          <div className="flex min-w-0 items-center gap-3">

            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-accent-border bg-accent-subtle text-accent">
              <MessageSquare
                size={17}
                strokeWidth={1.8}
              />
            </div>

            <div className="min-w-0">
              <h1 className="text-[15px] font-semibold tracking-tight text-primary">
                Chat
              </h1>

              <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-faint">
                Ask, log expenses, or check your budget
              </p>
            </div>

          </div>

          <Button
            variant="secondary"
            size="sm"
            icon={SquarePen}
            onClick={handleNewConversation}
          >
            New conversation
          </Button>

        </header>


        <div className="flex min-h-0 flex-1 overflow-y-auto scrollbar-thin px-5 sm:px-8">

          <div className="mx-auto flex w-full max-w-3xl flex-col py-6 sm:py-8">

            {loadingHistory ? (

              <div className="flex flex-1 items-center justify-center py-20">
                <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-faint">
                  Loading conversation...
                </p>
              </div>

            ) : messages.length === 0 ? (

              <div className="flex min-h-full flex-1 items-center justify-center px-2 pb-10">

                <div className="w-full max-w-xl">

                  <div className="mb-7 text-center">

                    <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-accent-border bg-accent-subtle text-accent">
                      <MessageSquare
                        size={20}
                        strokeWidth={1.7}
                      />
                    </div>

                    <p className="mb-1 text-[11px] font-medium uppercase tracking-[0.16em] text-muted">
                      Personal context
                    </p>

                    <h2 className="text-2xl font-semibold tracking-tight text-primary">
                      What would you like Mnemos to remember?
                    </h2>

                    <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">
                      Hi {firstName}. Ask something,
                      share a preference, or tell Mnemos
                      something useful for the future.
                    </p>

                  </div>

                  <EmptyState
                    icon={MessageSquare}
                    title="Start a conversation"
                    description="Your agent can remember useful personal information and bring it back when it matters."
                  />

                </div>

              </div>

            ) : (

              <div className="flex flex-col gap-1">

                {messages.map((message) => (
                  <ChatMessageRow
                    key={message.id}
                    message={message}
                    onRetry={handleRetry}
                  />
                ))}

              </div>

            )}

            <div ref={bottomRef} />

          </div>

        </div>


        <div className="shrink-0 border-t border-border bg-surface px-5 py-4 sm:px-8">

          <div className="mx-auto max-w-3xl">

            <div className="rounded-xl border border-border-strong bg-surface p-2 shadow-[0_4px_16px_rgba(32,37,34,0.04)] transition-colors focus-within:border-focus">

              <div className="flex items-end gap-2">

                <textarea
                  ref={textareaRef}
                  rows={1}
                  value={input}
                  onChange={autoGrow}
                  onKeyDown={handleKeyDown}
                  placeholder="Message Mnemos..."
                  className="min-h-[42px] max-h-[180px] flex-1 resize-none bg-transparent px-2.5 py-2 text-sm leading-6 text-primary outline-none placeholder:text-faint"
                />

                <button
                  type="button"
                  onClick={handleSend}
                  disabled={
                    !input.trim() ||
                    sending ||
                    loadingHistory
                  }
                  aria-label="Send message"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:bg-border-strong disabled:text-faint"
                >
                  <Send
                    size={16}
                    strokeWidth={1.9}
                  />
                </button>

              </div>

              <div className="flex items-center justify-between px-2.5 pb-1 pt-1">

                <span className="font-mono text-[10px] text-faint">
                  Enter to send · Shift + Enter for new line
                </span>

                <span className="font-mono text-[10px] text-faint">
                  {threadId.slice(0, 8)}
                </span>

              </div>

            </div>

          </div>

        </div>

      </div>

      <ChatSidePanel threadId={threadId} />

    </div>
  );
}
