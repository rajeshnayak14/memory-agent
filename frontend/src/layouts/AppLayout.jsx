import { useEffect, useRef, useState } from "react";
import {
  NavLink,
  Outlet,
  useNavigate,
  useLocation,
} from "react-router-dom";
import {
  PanelLeft,
  SquarePen,
  Search,
  Clock3,
  LayoutDashboard,
  Brain,
  Wallet,
  Tag,
  FileBarChart,
  Target,
  Settings as SettingsIcon,
  User,
  LogOut,
  X,
} from "lucide-react";

import { useAuth } from "../context/AuthContext";
import {
  listConversations,
  deleteConversation,
} from "../api/conversations";
import { getOrCreateThreadId } from "../utils/thread";
import NotificationBell from "../components/NotificationBell";
import ThemeToggle from "../components/ThemeToggle";

const NAV_ITEMS = [
  {
    to: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    to: "/expenses",
    label: "Expenses",
    icon: Wallet,
  },
  {
    to: "/categories",
    label: "Categories",
    icon: Tag,
  },
  {
    to: "/reports",
    label: "Reports",
    icon: FileBarChart,
  },
  {
    to: "/goals",
    label: "Goals",
    icon: Target,
  },
  {
    to: "/memories",
    label: "Memories",
    icon: Brain,
  },
];

function Brand({ collapsed }) {
  if (collapsed) {
    return (
      <div className="flex h-9 w-9 items-center justify-center">
        <img src="/logo.png" alt="Mnemos" className="h-8 w-8" />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2.5 px-2">
      <img src="/logo.png" alt="Mnemos" className="h-8 w-8 shrink-0" />

      <div>
        <p className="text-[17px] font-semibold tracking-tight text-primary">
          Mnemos
        </p>

        <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted">
          Your AI Finance Assistant
        </p>
      </div>
    </div>
  );
}

function SidebarButton({
  icon: Icon,
  label,
  collapsed,
  onClick,
  active = false,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={collapsed ? label : undefined}
      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
        collapsed ? "justify-center px-0" : ""
      } ${
        active
          ? "bg-accent-subtle text-accent"
          : "text-secondary hover:bg-surface-hover hover:text-primary"
      }`}
    >
      <Icon size={18} strokeWidth={1.8} />

      {!collapsed && <span>{label}</span>}
    </button>
  );
}

function RecentItem({
  conversation,
  collapsed,
  onClick,
  onDelete,
}) {
  if (collapsed) return null;

  return (
    <div className="group flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[13px] text-secondary transition-colors hover:bg-surface-hover hover:text-primary">
      <button
        type="button"
        onClick={onClick}
        className="flex min-w-0 flex-1 items-center gap-2 text-left"
      >
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-faint transition-colors group-hover:bg-accent" />

        <span className="truncate">
          {conversation.title}
        </span>
      </button>

      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onDelete(conversation);
        }}
        title="Delete conversation"
        className="shrink-0 rounded-md p-1 text-faint opacity-0 transition-all hover:bg-danger-subtle hover:text-danger group-hover:opacity-100"
      >
        ×
      </button>
    </div>
  );
}

function AccountMenuPanel({ onNavigate, onLogout, showLogout }) {
  return (
    <div className="absolute bottom-full left-0 z-50 mb-2 w-56 overflow-hidden rounded-xl border border-border bg-surface shadow-[0_18px_50px_rgba(32,37,34,0.12)]">
      <div className="p-1.5">
        <NavLink
          to="/settings"
          onClick={onNavigate}
          className={({ isActive }) =>
            `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
              isActive
                ? "bg-accent-subtle text-accent"
                : "text-secondary hover:bg-surface-hover hover:text-primary"
            }`
          }
        >
          <SettingsIcon size={16} strokeWidth={1.8} />
          Settings
        </NavLink>

        <NavLink
          to="/profile"
          onClick={onNavigate}
          className={({ isActive }) =>
            `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
              isActive
                ? "bg-accent-subtle text-accent"
                : "text-secondary hover:bg-surface-hover hover:text-primary"
            }`
          }
        >
          <User size={16} strokeWidth={1.8} />
          Profile
        </NavLink>

        {showLogout && (
          <button
            type="button"
            onClick={onLogout}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-secondary transition-colors hover:bg-surface-hover hover:text-primary"
          >
            <LogOut size={16} strokeWidth={1.8} />
            Log out
          </button>
        )}
      </div>

      <div className="flex items-center justify-center gap-2 border-t border-border p-2">
        <NotificationBell />
        <ThemeToggle />
      </div>
    </div>
  );
}

function UserBlock({ collapsed, onLogout }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const initial =
    user?.username?.[0]?.toUpperCase() || "?";

  const closeMenu = () => setOpen(false);

  if (collapsed) {
    return (
      <div ref={containerRef} className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          title={user?.username || "Account"}
          className="mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-accent-subtle font-mono text-xs font-semibold text-accent transition-colors hover:bg-accent-subtle"
        >
          {initial}
        </button>

        {open && (
          <AccountMenuPanel
            onNavigate={closeMenu}
            onLogout={onLogout}
            showLogout
          />
        )}
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative flex items-center gap-3 rounded-lg px-2 py-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex min-w-0 flex-1 items-center gap-3 text-left"
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-subtle font-mono text-xs font-semibold text-accent">
          {initial}
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm text-primary">
            {user?.username}
          </p>

          <p className="text-[11px] text-faint">
            Personal account
          </p>
        </div>
      </button>

      <button
        type="button"
        onClick={onLogout}
        title="Log out"
        className="shrink-0 rounded-md p-1.5 text-faint transition-colors hover:bg-surface-hover hover:text-primary"
      >
        <LogOut size={16} />
      </button>

      {open && (
        <AccountMenuPanel onNavigate={closeMenu} onLogout={onLogout} />
      )}
    </div>
  );
}

function SearchPanel({
  conversations,
  onSelect,
  onClose,
}) {
  const [query, setQuery] = useState("");

  const filtered = conversations.filter(
    (conversation) =>
      conversation.title
        .toLowerCase()
        .includes(query.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-primary/20 px-4 pt-20">
      <div className="w-full max-w-xl overflow-hidden rounded-xl border border-border bg-surface shadow-[0_18px_50px_rgba(32,37,34,0.12)]">
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <Search
            size={18}
            className="text-muted"
          />

          <input
            autoFocus
            value={query}
            onChange={(event) =>
              setQuery(event.target.value)
            }
            placeholder="Search conversations..."
            className="min-w-0 flex-1 bg-transparent text-sm text-primary outline-none placeholder:text-faint"
          />

          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-muted transition-colors hover:bg-surface-hover hover:text-primary"
          >
            <X size={17} />
          </button>
        </div>

        <div className="max-h-[420px] overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-faint">
              No conversations found.
            </p>
          ) : (
            filtered.map((conversation) => (
              <button
                key={conversation.thread_id}
                type="button"
                onClick={() =>
                  onSelect(conversation)
                }
                className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm text-secondary transition-colors hover:bg-surface-hover hover:text-primary"
              >
                <Clock3
                  size={16}
                  strokeWidth={1.7}
                  className="shrink-0 text-faint"
                />

                <span className="truncate">
                  {conversation.title}
                </span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function RecentsPanel({
  conversations,
  onSelect,
  onClose,
}) {
  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Close recents"
        className="absolute inset-0 bg-primary/10"
        onClick={onClose}
      />

      <div className="absolute left-16 top-20 w-80 rounded-xl border border-border bg-surface p-3 shadow-[0_18px_50px_rgba(32,37,34,0.12)]">
        <div className="mb-2 flex items-center justify-between px-2">
          <div>
            <p className="text-sm font-semibold text-primary">
              Recent conversations
            </p>

            <p className="mt-0.5 text-[11px] text-faint">
              Continue where you left off
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-faint transition-colors hover:bg-surface-hover hover:text-primary"
          >
            <X size={16} />
          </button>
        </div>

        <div className="max-h-[420px] overflow-y-auto">
          {conversations.length === 0 ? (
            <p className="px-2 py-6 text-sm text-faint">
              No conversations yet.
            </p>
          ) : (
            conversations.map((conversation) => (
              <button
                key={conversation.thread_id}
                type="button"
                onClick={() =>
                  onSelect(conversation)
                }
                className="group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-secondary transition-colors hover:bg-surface-hover hover:text-primary"
              >
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-faint group-hover:bg-accent" />

                <span className="truncate">
                  {conversation.title}
                </span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const [collapsed, setCollapsed] = useState(false);
  const [conversations, setConversations] =
    useState([]);
  const [panel, setPanel] = useState(null);

  const refreshConversations = () => {
    listConversations()
      .then((data) => {
        setConversations(
          data.conversations || []
        );
      })
      .catch(() => {
        setConversations([]);
      });
  };

  useEffect(() => {
    refreshConversations();
  }, []);

  useEffect(() => {
    window.addEventListener(
      "mnemos:conversation-updated",
      refreshConversations
    );

    return () => {
      window.removeEventListener(
        "mnemos:conversation-updated",
        refreshConversations
      );
    };
  }, []);

  const openConversation = (conversation) => {
    setPanel(null);

    navigate(
      `/chat?thread_id=${encodeURIComponent(
        conversation.thread_id
      )}`
    );
  };

  const handleDeleteConversation = async (
    conversation
  ) => {
    // The Expenses dashboard attributes anything it creates to this same
    // default thread id, so deleting it here silently takes those
    // expenses/budgets/recurring rules with it — worth a stronger warning.
    const isDefaultThread =
      user &&
      conversation.thread_id ===
        getOrCreateThreadId(user.id);

    const confirmed = window.confirm(
      isDefaultThread
        ? `Delete "${conversation.title}"? This is your default thread — ` +
          `any expenses, budgets, or recurring rules logged from the ` +
          `Expenses page live here too, and will be deleted with it.`
        : `Delete "${conversation.title}"?`
    );

    if (!confirmed) return;

    try {
      await deleteConversation(
        conversation.thread_id
      );

      // Remove from sidebar immediately.
      setConversations((current) =>
        current.filter(
          (item) =>
            item.thread_id !==
            conversation.thread_id
        )
      );

      setPanel(null);

      // Notify Chat.jsx that this conversation
      // has been deleted.
      window.dispatchEvent(
        new CustomEvent(
          "mnemos:conversation-deleted",
          {
            detail: {
              threadId:
                conversation.thread_id,
            },
          }
        )
      );

      // Check whether the deleted conversation
      // is currently open.
      const params = new URLSearchParams(
        location.search
      );

      const currentThreadId =
        params.get("thread_id");

      if (
        currentThreadId ===
        conversation.thread_id
      ) {
        navigate(
          "/chat?new=1",
          {
            replace: true,
          }
        );
      }
    } catch (error) {
      console.error(
        "Failed to delete conversation:",
        error
      );

      alert(
        "Failed to delete conversation."
      );
    }
  };

  const newChat = () => {
    setPanel(null);
    navigate("/chat?new=1");
  };

  return (
    <div className="flex min-h-screen bg-page text-primary">
      <aside
        className={`hidden shrink-0 border-r border-border bg-surface transition-[width] duration-200 lg:flex lg:flex-col ${
          collapsed
            ? "w-[64px]"
            : "w-[260px]"
        }`}
      >
        <div
          className={`flex h-16 items-center ${
            collapsed
              ? "justify-center"
              : "justify-between px-3"
          }`}
        >
          <Brand collapsed={collapsed} />

          {!collapsed && (
            <button
              type="button"
              onClick={() =>
                setCollapsed(true)
              }
              title="Collapse sidebar"
              className="rounded-lg p-2 text-muted transition-colors hover:bg-surface-hover hover:text-primary"
            >
              <PanelLeft size={18} />
            </button>
          )}
        </div>

        {collapsed && (
          <button
            type="button"
            onClick={() =>
              setCollapsed(false)
            }
            title="Open sidebar"
            className="mx-auto mb-3 rounded-lg p-2 text-secondary transition-colors hover:bg-surface-hover hover:text-primary"
          >
            <PanelLeft size={18} />
          </button>
        )}

        <div className="flex flex-col gap-1 px-2">
          <SidebarButton
            icon={SquarePen}
            label="New chat"
            collapsed={collapsed}
            onClick={newChat}
          />

          <SidebarButton
            icon={Search}
            label="Search"
            collapsed={collapsed}
            onClick={() =>
              setPanel("search")
            }
          />

          <SidebarButton
            icon={Clock3}
            label="Recents"
            collapsed={collapsed}
            onClick={() =>
              setPanel("recents")
            }
          />
        </div>

        {!collapsed && (
          <div className="mt-6 flex-1 overflow-y-auto px-2">
            <div className="mb-2 flex items-center justify-between px-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-faint">
                Recent chats
              </p>

              {conversations.length > 0 && (
                <span className="font-mono text-[10px] text-faint">
                  {conversations.length}
                </span>
              )}
            </div>

            <div className="space-y-0.5">
              {conversations.map(
                (conversation) => (
                  <RecentItem
                    key={conversation.thread_id}
                    conversation={conversation}
                    collapsed={collapsed}
                    onClick={() =>
                      openConversation(
                        conversation
                      )
                    }
                    onDelete={
                      handleDeleteConversation
                    }
                  />
                )
              )}

              {conversations.length === 0 && (
                <p className="px-3 py-2 text-xs leading-5 text-faint">
                  Conversations will appear here as you chat.
                </p>
              )}
            </div>

            <div className="my-5 border-t border-border" />

            <div className="space-y-1">
              {NAV_ITEMS.map(
                ({
                  to,
                  label,
                  icon: Icon,
                }) => (
                  <NavLink
                    key={to}
                    to={to}
                    className={({
                      isActive,
                    }) =>
                      `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                        isActive
                          ? "bg-accent-subtle text-accent"
                          : "text-secondary hover:bg-surface-hover hover:text-primary"
                      }`
                    }
                  >
                    <Icon
                      size={18}
                      strokeWidth={1.8}
                    />

                    <span>{label}</span>
                  </NavLink>
                )
              )}
            </div>
          </div>
        )}

        {collapsed && (
          <div className="mt-4 flex flex-1 flex-col items-center gap-1 px-2">
            {NAV_ITEMS.map(
              ({
                to,
                label,
                icon: Icon,
              }) => (
                <NavLink
                  key={to}
                  to={to}
                  title={label}
                  className={({
                    isActive,
                  }) =>
                    `flex h-10 w-10 items-center justify-center rounded-lg transition-colors ${
                      isActive
                        ? "bg-accent-subtle text-accent"
                        : "text-secondary hover:bg-surface-hover hover:text-primary"
                    }`
                  }
                >
                  <Icon
                    size={18}
                    strokeWidth={1.8}
                  />
                </NavLink>
              )
            )}
          </div>
        )}

        <div className="border-t border-border p-2">
          <UserBlock
            collapsed={collapsed}
            onLogout={logout}
          />
        </div>
      </aside>

      <main className="min-w-0 flex-1">
        <Outlet />
      </main>

      {panel === "search" && (
        <SearchPanel
          conversations={conversations}
          onSelect={openConversation}
          onClose={() =>
            setPanel(null)
          }
        />
      )}

      {panel === "recents" && (
        <RecentsPanel
          conversations={conversations}
          onSelect={openConversation}
          onClose={() =>
            setPanel(null)
          }
        />
      )}
    </div>
  );
}