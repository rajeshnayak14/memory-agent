import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, AlertTriangle, CheckCheck } from "lucide-react";

import {
  listNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
} from "../api/notifications";
import { formatRelative } from "../utils/formatDate";

const POLL_INTERVAL_MS = 45000;

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef(null);

  const refreshCount = useCallback(() => {
    getUnreadCount()
      .then((data) => setUnreadCount(data.count))
      .catch(() => {});
  }, []);

  useEffect(() => {
    refreshCount();
    const interval = setInterval(refreshCount, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [refreshCount]);

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

  const openPanel = () => {
    setOpen((v) => !v);

    if (!open) {
      setLoading(true);
      listNotifications({ limit: 20 })
        .then((data) => setNotifications(data.notifications))
        .catch(() => setNotifications([]))
        .finally(() => setLoading(false));
    }
  };

  const handleMarkRead = (notification) => {
    if (notification.read) return;

    setNotifications((prev) =>
      prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));

    markNotificationRead(notification.id).catch(() => {});
  };

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
    markAllNotificationsRead().catch(() => {});
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={openPanel}
        aria-label="Notifications"
        className="relative flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface text-muted shadow-panel transition-colors hover:text-accent"
      >
        <Bell size={15} strokeWidth={1.9} />

        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 font-mono text-[9px] font-semibold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-xl border border-border bg-surface shadow-[0_18px_50px_rgba(32,37,34,0.12)]">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <p className="text-sm font-semibold text-primary">Notifications</p>

            {notifications.some((n) => !n.read) && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="flex items-center gap-1 text-xs font-medium text-secondary transition-colors hover:text-accent"
              >
                <CheckCheck size={13} strokeWidth={1.9} />
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <p className="px-4 py-8 text-center text-sm text-faint">Loading…</p>
            ) : notifications.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-faint">
                Nothing here yet.
              </p>
            ) : (
              notifications.map((notification) => (
                <button
                  key={notification.id}
                  type="button"
                  onClick={() => handleMarkRead(notification)}
                  className={`flex w-full items-start gap-2.5 border-b border-border px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-surface-hover ${
                    notification.read ? "" : "bg-accent-subtle/40"
                  }`}
                >
                  <AlertTriangle
                    size={14}
                    strokeWidth={1.9}
                    className={`mt-0.5 shrink-0 ${
                      notification.type === "budget_over" ? "text-danger" : "text-warn"
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-primary">
                      {notification.title}
                    </p>
                    <p className="mt-0.5 text-xs leading-5 text-muted">
                      {notification.body}
                    </p>
                    <p className="mt-1 font-mono text-[10px] text-faint">
                      {formatRelative(notification.created_at)}
                    </p>
                  </div>
                  {!notification.read && (
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
