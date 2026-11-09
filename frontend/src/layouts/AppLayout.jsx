import { useEffect, useRef, useState, useCallback } from "react";
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
  ShieldCheck,
  Sparkles,
  Menu,
  Pencil,
  Check,
} from "lucide-react";

import { useAuth } from "../context/AuthContext";
import { useTour, hasTourBeenSeen } from "../context/TourContext";
import {
  listConversations,
  renameConversation,
  deleteConversation,
} from "../api/conversations";
import { getOrCreateThreadId } from "../utils/thread";
import NotificationBell from "../components/NotificationBell";
import ThemeToggle from "../components/ThemeToggle";
import TourOverlay from "../components/TourOverlay";

const NAV_ITEMS = [
  {
    to: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    tourId: "nav-dashboard",
  },
  {
    to: "/expenses",
    label: "Expenses",
    icon: Wallet,
    tourId: "nav-expenses",
  },
  {
    to: "/categories",
    label: "Categories",
    icon: Tag,
    tourId: "nav-categories",
  },
  {
    to: "/reports",
    label: "Reports",
    icon: FileBarChart,
    tourId: "nav-reports",
  },
  {
    to: "/goals",
    label: "Goals",
    icon: Target,
    tourId: "nav-goals",
  },
  {
    to: "/memories",
    label: "Memories",
    icon: Brain,
    tourId: "nav-memories",
  },
];

const ADMIN_NAV_ITEM = {
  to: "/admin",
  label: "Admin",
  icon: ShieldCheck,
};

function Brand({ collapsed }) {
  if (collapsed) {
    return (
      <div className="flex h-9 w-9 items-center justify-center">
        <img src="/logo.png" alt="Mnemos" className="h-8 w-8" />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 px-2">
      <img src="/logo.png" alt="Mnemos" className="h-8 w-8 shrink-0" />

      <p className="font-brand text-2xl tracking-wide text-primary">
        Mnemos
      </p>
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
      className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-sm transition-colors ${
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

function RecentItem({ conversation, collapsed, onClick, onDelete, onRename }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(conversation.title);
  const inputRef = useRef(null);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  const startEdit = (e) => {
    e.stopPropagation();
    setDraft(conversation.title);
    setEditing(true);
  };

  const commitEdit = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== conversation.title) onRename(conversation, trimmed);
    setEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") commitEdit();
    if (e.key === "Escape") setEditing(false);
  };

  if (collapsed) return null;

  if (editing) {
    return (
      <div className="flex w-full items-center gap-1.5 rounded-2xl px-3 py-1.5">
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={commitEdit}
          className="min-w-0 flex-1 rounded-lg bg-surface-hover px-2 py-1 text-sm text-primary outline-none ring-1 ring-focus"
        />
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); commitEdit(); }}
          className="shrink-0 rounded-md p-1 text-accent hover:bg-accent-subtle"
        >
          <Check size={14} strokeWidth={2} />
        </button>
      </div>
    );
  }

  return (
    <div className="group flex w-full items-center gap-2 rounded-2xl px-3 py-2 text-sm text-secondary transition-colors hover:bg-surface-hover hover:text-primary">
      <button
        type="button"
        onClick={onClick}
        className="flex min-w-0 flex-1 items-center gap-2 text-left"
      >
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-faint transition-colors group-hover:bg-accent" />
        <span className="truncate">{conversation.title}</span>
      </button>

      <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          type="button"
          onClick={startEdit}
          title="Rename"
          className="rounded-md p-1 text-faint hover:bg-surface-hover hover:text-primary"
        >
          <Pencil size={12} strokeWidth={1.9} />
        </button>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onDelete(conversation); }}
          title="Delete"
          className="rounded-md p-1 text-faint hover:bg-danger-subtle hover:text-danger"
        >
          ×
        </button>
      </div>
    </div>
  );
}

function AccountMenuPanel({ onNavigate, onLogout, onStartTour, showLogout }) {
  return (
    <div className="absolute bottom-full left-0 z-50 mb-2 w-56 overflow-hidden rounded-3xl border border-border bg-surface shadow-[0_18px_50px_rgba(32,37,34,0.12)]">
      <div className="p-1.5">
        <button
          type="button"
          onClick={() => {
            onNavigate();
            onStartTour();
          }}
          className="flex w-full items-center gap-2.5 rounded-2xl px-3 py-2 text-left text-sm text-secondary transition-colors hover:bg-surface-hover hover:text-primary"
        >
          <Sparkles size={16} strokeWidth={1.8} />
          Take a tour
        </button>

        <NavLink
          to="/settings"
          onClick={onNavigate}
          className={({ isActive }) =>
            `flex items-center gap-2.5 rounded-2xl px-3 py-2 text-sm transition-colors ${
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
            `flex items-center gap-2.5 rounded-2xl px-3 py-2 text-sm transition-colors ${
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
            className="flex w-full items-center gap-2.5 rounded-2xl px-3 py-2 text-left text-sm text-secondary transition-colors hover:bg-surface-hover hover:text-primary"
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

function UserBlock({ collapsed, onLogout, onStartTour }) {
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
            onStartTour={onStartTour}
            showLogout
          />
        )}
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative flex items-center gap-3 rounded-2xl px-2 py-2">
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
        <AccountMenuPanel onNavigate={closeMenu} onLogout={onLogout} onStartTour={onStartTour} />
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
      <div className="w-full max-w-xl overflow-hidden rounded-3xl border border-border bg-surface shadow-[0_18px_50px_rgba(32,37,34,0.12)]">
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
                className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm text-secondary transition-colors hover:bg-surface-hover hover:text-primary"
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

      <div className="absolute left-16 top-20 w-80 rounded-3xl border border-border bg-surface p-3 shadow-[0_18px_50px_rgba(32,37,34,0.12)]">
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
                className="group flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm text-secondary transition-colors hover:bg-surface-hover hover:text-primary"
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
  const { start: startTour } = useTour();

  const navItems = user?.is_admin
    ? [...NAV_ITEMS, ADMIN_NAV_ITEM]
    : NAV_ITEMS;

  useEffect(() => {
    if (user?.id && !hasTourBeenSeen(user.id)) {
      startTour(user.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem("mnemos.sidebar.collapsed") === "true"; }
    catch { return false; }
  });
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [panel, setPanel] = useState(null);

  const toggleCollapsed = (next) => {
    const val = typeof next === "boolean" ? next : !collapsed;
    setCollapsed(val);
    try { localStorage.setItem("mnemos.sidebar.collapsed", String(val)); } catch {}
  };

  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

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

  const handleRenameConversation = useCallback(async (conversation, newTitle) => {
    try {
      await renameConversation(conversation.thread_id, newTitle);
      setConversations((prev) =>
        prev.map((c) =>
          c.thread_id === conversation.thread_id ? { ...c, title: newTitle } : c
        )
      );
    } catch {
      alert("Could not rename conversation.");
    }
  }, []);

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
    <div className="flex h-dvh overflow-hidden bg-page text-primary">

      {/* Mobile backdrop */}
      {mobileNavOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setMobileNavOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-40 flex h-dvh shrink-0 flex-col
          border-r border-border bg-surface
          shadow-2xl transition-transform duration-200
          lg:static lg:z-auto lg:shadow-none lg:translate-x-0 lg:transition-[width]
          ${mobileNavOpen ? "translate-x-0" : "-translate-x-full"}
          ${collapsed ? "w-[72px]" : "w-[280px] lg:w-[260px]"}
        `}
      >
        {/* Single scrollable content area — everything scrolls together except the profile */}
        <div className="sidebar-scroll flex-1 overflow-y-auto">

          {/* Header */}
          <div className={`flex h-14 items-center px-2 ${collapsed ? "justify-center" : "justify-between"}`}>
            {!collapsed && <Brand collapsed={false} />}

            <button
              type="button"
              onClick={() => toggleCollapsed()}
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              className="hidden rounded-xl p-2 text-muted transition-colors hover:bg-surface-hover hover:text-primary lg:flex"
            >
              <PanelLeft size={18} strokeWidth={1.8} />
            </button>

            <button
              type="button"
              onClick={() => setMobileNavOpen(false)}
              aria-label="Close menu"
              className="rounded-xl p-2 text-muted transition-colors hover:bg-surface-hover hover:text-primary lg:hidden"
            >
              <X size={18} strokeWidth={1.8} />
            </button>
          </div>

          {/* Quick actions */}
          <div className="px-2 pb-1 flex flex-col gap-0.5">
            <SidebarButton icon={SquarePen} label="New chat" collapsed={collapsed} onClick={newChat} />
            <SidebarButton
              icon={Search}
              label="Search"
              collapsed={collapsed}
              onClick={() => { setPanel("search"); setMobileNavOpen(false); }}
            />
            {collapsed && (
              <SidebarButton
                icon={Clock3}
                label="Recents"
                collapsed={collapsed}
                onClick={() => { setPanel("recents"); setMobileNavOpen(false); }}
              />
            )}
          </div>

          {/* Navigation */}
          <div className="px-2 pt-3 pb-2">
            {!collapsed && (
              <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-faint">
                Menu
              </p>
            )}
            <div className={`flex flex-col gap-0.5 ${collapsed ? "items-center" : ""}`}>
              {navItems.map(({ to, label, icon: Icon, tourId }) =>
                collapsed ? (
                  <NavLink
                    key={to}
                    to={to}
                    title={label}
                    data-tour={tourId}
                    className={({ isActive }) =>
                      `flex h-10 w-10 items-center justify-center rounded-xl transition-colors ${
                        isActive ? "bg-accent-subtle text-accent" : "text-secondary hover:bg-surface-hover hover:text-primary"
                      }`
                    }
                  >
                    <Icon size={18} strokeWidth={1.8} />
                  </NavLink>
                ) : (
                  <NavLink
                    key={to}
                    to={to}
                    data-tour={tourId}
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors ${
                        isActive ? "bg-accent-subtle text-accent" : "text-secondary hover:bg-surface-hover hover:text-primary"
                      }`
                    }
                  >
                    <Icon size={18} strokeWidth={1.8} />
                    <span>{label}</span>
                  </NavLink>
                )
              )}
            </div>
          </div>

          {/* Recent chats — flows naturally after nav, no fixed height or independent scroll */}
          {!collapsed && (
            <div className="px-2 pt-2 pb-4">
              <div className="mb-1 flex items-center justify-between border-t border-border px-3 pt-3">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-faint">
                  Recent
                </p>
                {conversations.length > 0 && (
                  <span className="font-mono text-[10px] text-faint">
                    {conversations.length}
                  </span>
                )}
              </div>

              {conversations.length === 0 ? (
                <p className="px-3 py-3 text-xs leading-5 text-faint">
                  Conversations will appear here as you chat.
                </p>
              ) : (
                <div className="space-y-0.5">
                  {conversations.map((conversation) => (
                    <RecentItem
                      key={conversation.thread_id}
                      conversation={conversation}
                      collapsed={false}
                      onClick={() => openConversation(conversation)}
                      onDelete={handleDeleteConversation}
                      onRename={handleRenameConversation}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

        </div>

        {/* User profile — fixed at bottom, outside the scroll area */}
        <div className="shrink-0 border-t border-border p-2">
          <UserBlock
            collapsed={collapsed}
            onLogout={logout}
            onStartTour={() => startTour(user?.id)}
          />
        </div>
      </aside>

      {/* ── Main content ── */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {/* Mobile topbar */}
        <div className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-surface px-4 lg:hidden">
          <button
            type="button"
            onClick={() => { setCollapsed(false); setMobileNavOpen(true); }}
            aria-label="Open menu"
            className="rounded-xl p-2 text-secondary transition-colors hover:bg-surface-hover hover:text-primary"
          >
            <Menu size={20} strokeWidth={1.8} />
          </button>
          <Brand collapsed={false} />
        </div>

        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      {/* ── Panels ── */}
      {panel === "search" && (
        <SearchPanel
          conversations={conversations}
          onSelect={openConversation}
          onClose={() => setPanel(null)}
        />
      )}

      {panel === "recents" && (
        <RecentsPanel
          conversations={conversations}
          onSelect={openConversation}
          onClose={() => setPanel(null)}
        />
      )}

      <TourOverlay />
    </div>
  );
}