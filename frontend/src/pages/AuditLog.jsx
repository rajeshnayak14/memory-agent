import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  History,
  Search,
  AlertTriangle,
  ArrowLeft,
} from "lucide-react";

import { listAuditLogs } from "../api/admin";
import { getErrorMessage } from "../utils/errorMessage";
import { formatDate } from "../utils/formatDate";
import Button from "../components/Button";
import Spinner from "../components/Spinner";
import EmptyState from "../components/EmptyState";

const ACTION_TONES = {
  user_login: "accent",
  user_login_failed: "danger",
  user_login_blocked_unverified: "muted",
  user_registered: "accent",
  user_logout: "muted",
  admin_user_created: "accent",
  admin_user_updated: "muted",
  admin_user_deleted: "danger",
};

function actionLabel(action) {
  return action.replace(/[._]/g, " ");
}

function actionTone(action) {
  return ACTION_TONES[action.replace(/\./g, "_")] || "muted";
}

function Badge({ tone, children }) {
  const tones = {
    accent: "border-accent-border bg-accent-subtle text-accent",
    danger: "border-danger-border bg-danger-subtle text-danger",
    muted: "border-border bg-surface-subtle text-muted",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium capitalize ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

export default function AuditLog() {
  const navigate = useNavigate();

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [query, setQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");

  useEffect(() => {
    setLoading(true);
    setLoadError("");

    listAuditLogs(query)
      .then(setLogs)
      .catch((err) =>
        setLoadError(getErrorMessage(err, "Could not load the audit log."))
      )
      .finally(() => setLoading(false));
  }, [query]);

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    setQuery(searchInput.trim());
  };

  return (
    <div className="min-h-screen bg-page px-6 py-8 sm:px-10 sm:py-10">
      <div className="mx-auto max-w-5xl">
        <header className="flex flex-wrap items-start justify-between gap-5">
          <div className="flex items-start gap-3.5">
            <div className="icon-blob flex h-10 w-10 shrink-0 items-center justify-center bg-accent-subtle text-accent">
              <History size={19} strokeWidth={1.8} />
            </div>

            <div>
              <p className="mb-0.5 text-sm text-muted">
                Administration
              </p>
              <h1 className="font-heading text-2xl font-semibold tracking-tight text-primary">
                Audit log
              </h1>
              <p className="mt-1 text-sm text-muted">
                Account security and admin activity, most recent first.
              </p>
            </div>
          </div>

          <Button
            variant="secondary"
            size="sm"
            icon={ArrowLeft}
            onClick={() => navigate("/admin")}
          >
            Back to admin
          </Button>
        </header>

        <form
          onSubmit={handleSearchSubmit}
          className="mt-7 flex items-center gap-3"
        >
          <div className="flex flex-1 items-center gap-2 rounded-2xl border border-border bg-surface px-3 py-2">
            <Search size={15} className="text-faint" />
            <input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search by username..."
              className="min-w-0 flex-1 bg-transparent text-sm text-primary outline-none placeholder:text-faint"
            />
          </div>
          <Button type="submit" variant="secondary" size="sm">
            Search
          </Button>
          {query && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchInput("");
                setQuery("");
              }}
            >
              Clear
            </Button>
          )}
        </form>

        <div className="mt-5">
          {loading ? (
            <div className="flex justify-center rounded-3xl border border-border bg-surface py-16">
              <Spinner size={20} />
            </div>
          ) : loadError ? (
            <EmptyState
              icon={AlertTriangle}
              title="Could not load the audit log"
              description={loadError}
              action={
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => window.location.reload()}
                >
                  Try again
                </Button>
              }
            />
          ) : logs.length === 0 ? (
            <EmptyState icon={History} title="No activity recorded yet" />
          ) : (
            <div className="overflow-x-auto rounded-3xl border border-border bg-surface shadow-soft dark:shadow-none">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-xs uppercase tracking-wide text-faint">
                    <th className="px-4 py-3 font-medium">When</th>
                    <th className="px-4 py-3 font-medium">Actor</th>
                    <th className="px-4 py-3 font-medium">Action</th>
                    <th className="px-4 py-3 font-medium">Target</th>
                    <th className="px-4 py-3 font-medium">Detail</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr
                      key={log.id}
                      className="border-b border-border last:border-0 hover:bg-surface-hover"
                    >
                      <td className="px-4 py-3 whitespace-nowrap text-secondary">
                        {formatDate(log.created_at)}
                      </td>
                      <td className="px-4 py-3 text-primary">
                        {log.actor_username || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={actionTone(log.action)}>
                          {actionLabel(log.action)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-secondary">
                        {log.target_username || "—"}
                      </td>
                      <td className="px-4 py-3 text-xs text-faint">
                        {log.detail || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
