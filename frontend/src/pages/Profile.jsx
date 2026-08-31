import { useEffect } from "react";
import { Activity, UserRound } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { formatDate } from "../utils/formatDate";

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-3.5 last:border-b-0">
      <span className="text-sm text-muted">{label}</span>
      <span className="min-w-0 truncate text-right text-sm font-medium text-primary">
        {value}
      </span>
    </div>
  );
}

export default function Profile() {
  const { user, refreshProfile } = useAuth();

  useEffect(() => {
    refreshProfile().catch(() => {});
  }, [refreshProfile]);

  if (!user) return null;

  const initial = user.username?.[0]?.toUpperCase() ?? "?";

  return (
    <div className="min-h-screen bg-page px-6 py-8 sm:px-10 sm:py-10">
      <div className="mx-auto max-w-2xl">
        <header>
          <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.15em] text-muted">
            Account
          </p>
          <h1 className="text-xl font-semibold tracking-tight text-primary">
            Profile
          </h1>
          <p className="mt-1 text-sm text-muted">
            Your account details.
          </p>
        </header>

        <section className="mt-7 flex items-center gap-4 rounded-xl border border-border bg-surface p-5 shadow-[0_4px_16px_rgba(32,37,34,0.03)]">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-accent-border bg-accent-subtle font-mono text-lg font-semibold text-accent">
            {initial}
          </div>

          <div className="min-w-0">
            <p className="text-base font-semibold text-primary">
              {user.username}
            </p>
            <div className="mt-1.5 flex items-center gap-1.5">
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  user.is_active ? "bg-success" : "bg-danger"
                }`}
              />
              <span className="text-xs text-muted">
                {user.is_active ? "Active" : "Inactive"}
              </span>
            </div>
          </div>
        </section>

        <section className="mt-6 overflow-hidden rounded-xl border border-border bg-surface shadow-[0_4px_16px_rgba(32,37,34,0.03)]">
          <div className="flex items-center gap-2 border-b border-border px-5 py-3.5">
            <UserRound size={15} className="text-accent" strokeWidth={1.8} />
            <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
              Account information
            </p>
          </div>

          <Row label="Username" value={user.username} />
          <Row label="Email" value={user.email || "—"} />
          <Row
            label="Account status"
            value={user.is_active ? "Active" : "Inactive"}
          />
          <Row
            label="Member since"
            value={formatDate(user.created_at)}
          />
        </section>

        <div className="mt-4 flex items-center gap-2 px-1">
          <Activity size={13} className="text-muted" strokeWidth={1.8} />
          <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-faint">
            Account information is synced from your active session
          </span>
        </div>
      </div>
    </div>
  );
}
