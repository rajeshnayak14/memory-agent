import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ShieldCheck,
  Users,
  Search,
  AlertTriangle,
  X,
  ShieldOff,
  Shield,
  Ban,
  CheckCircle2,
  Trash2,
  Wallet,
  Target,
  UserPlus,
} from "lucide-react";

import {
  createAdminUser,
  listAdminUsers,
  getAdminStats,
  getAdminUserDetail,
  updateAdminUser,
  deleteAdminUser,
} from "../api/admin";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { getErrorMessage } from "../utils/errorMessage";
import { formatDate } from "../utils/formatDate";
import { formatMoney } from "../utils/currency";
import { isPasswordValid, PASSWORD_REQUIREMENT } from "../utils/password";
import Button from "../components/Button";
import Spinner from "../components/Spinner";
import TextField from "../components/TextField";
import EmptyState from "../components/EmptyState";
import ConfirmDialog from "../components/ConfirmDialog";

function StatCard({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-surface p-4">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-accent-border bg-accent-subtle text-accent">
        <Icon size={16} strokeWidth={1.9} />
      </div>

      <div>
        <p className="text-lg font-semibold leading-tight text-primary">
          {value}
        </p>
        <p className="text-xs text-muted">{label}</p>
      </div>
    </div>
  );
}

function Badge({ tone, children }) {
  const tones = {
    accent: "border-accent-border bg-accent-subtle text-accent",
    danger: "border-danger-border bg-danger-subtle text-danger",
    muted: "border-border bg-surface-subtle text-muted",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

function CreateUserForm({ onCancel, onCreated, notify }) {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!isPasswordValid(password)) {
      setError(PASSWORD_REQUIREMENT);
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const created = await createAdminUser({
        username,
        email,
        password,
        is_admin: isAdmin,
      });
      notify(`${created.username} created.`);
      onCreated(created);
    } catch (err) {
      setError(getErrorMessage(err, "Could not create user."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-6 rounded-xl border border-border bg-surface p-4 shadow-[0_4px_16px_rgba(32,37,34,0.04)]"
    >
      <div className="mb-3 flex items-center gap-2 px-1">
        <UserPlus size={14} className="text-accent" strokeWidth={1.8} />
        <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
          New user
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <TextField
          label="Username"
          id="new-user-username"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          required
          minLength={3}
          maxLength={100}
          autoFocus
        />
        <TextField
          label="Email"
          id="new-user-email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
        <TextField
          label="Password"
          id="new-user-password"
          type="text"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          minLength={8}
          maxLength={100}
          hint={PASSWORD_REQUIREMENT}
        />
      </div>

      {error && <p className="mt-3 text-sm text-danger">{error}</p>}

      <div className="mt-3 flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm text-secondary">
          <input
            type="checkbox"
            checked={isAdmin}
            onChange={(event) => setIsAdmin(event.target.checked)}
            className="h-4 w-4 rounded border-border-strong accent-accent"
          />
          Grant admin access
        </label>

        <div className="flex gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onCancel}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="accent"
            size="sm"
            loading={submitting}
          >
            Create user
          </Button>
        </div>
      </div>
    </form>
  );
}

function UserDetailPanel({ userId, onClose, notify }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    getAdminUserDetail(userId)
      .then(setDetail)
      .catch((err) =>
        setError(getErrorMessage(err, "Could not load user details."))
      )
      .finally(() => setLoading(false));
  }, [userId]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-primary/20 px-4 pt-16">
      <div className="w-full max-w-lg overflow-hidden rounded-xl border border-border bg-surface shadow-[0_18px_50px_rgba(32,37,34,0.12)]">
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
          <p className="text-sm font-semibold text-primary">User details</p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-muted transition-colors hover:bg-surface-hover hover:text-primary"
          >
            <X size={17} />
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto p-5">
          {loading ? (
            <div className="flex justify-center py-10">
              <Spinner size={20} />
            </div>
          ) : error ? (
            <p className="text-sm text-danger">{error}</p>
          ) : (
            <div className="space-y-5">
              <div>
                <p className="text-base font-semibold text-primary">
                  {detail.username}
                </p>
                <p className="text-sm text-muted">{detail.email || "—"}</p>

                <div className="mt-2 flex gap-2">
                  <Badge tone={detail.is_active ? "accent" : "danger"}>
                    {detail.is_active ? "Active" : "Inactive"}
                  </Badge>
                  <Badge tone={detail.is_admin ? "accent" : "muted"}>
                    {detail.is_admin ? "Admin" : "User"}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-faint">Joined</p>
                  <p className="text-secondary">
                    {formatDate(detail.created_at)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-faint">Preferred currency</p>
                  <p className="text-secondary">{detail.preferred_currency}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 text-sm">
                <div className="rounded-lg border border-border bg-surface-subtle p-3 text-center">
                  <p className="text-lg font-semibold text-primary">
                    {detail.expense_count}
                  </p>
                  <p className="text-xs text-faint">Expenses</p>
                </div>
                <div className="rounded-lg border border-border bg-surface-subtle p-3 text-center">
                  <p className="text-lg font-semibold text-primary">
                    {detail.budget_count}
                  </p>
                  <p className="text-xs text-faint">Budgets</p>
                </div>
                <div className="rounded-lg border border-border bg-surface-subtle p-3 text-center">
                  <p className="text-lg font-semibold text-primary">
                    {detail.goal_count}
                  </p>
                  <p className="text-xs text-faint">Goals</p>
                </div>
                <div className="rounded-lg border border-border bg-surface-subtle p-3 text-center">
                  <p className="text-lg font-semibold text-primary">
                    {detail.category_count}
                  </p>
                  <p className="text-xs text-faint">Categories</p>
                </div>
                <div className="rounded-lg border border-border bg-surface-subtle p-3 text-center">
                  <p className="text-lg font-semibold text-primary">
                    {detail.conversation_count}
                  </p>
                  <p className="text-xs text-faint">Conversations</p>
                </div>
              </div>

              <div>
                <p className="mb-1.5 text-xs uppercase tracking-wide text-faint">
                  Total spent
                </p>
                {detail.total_spent.length === 0 ? (
                  <p className="text-sm text-muted">No expenses logged.</p>
                ) : (
                  <div className="space-y-1">
                    {detail.total_spent.map((row) => (
                      <div
                        key={row.currency}
                        className="flex items-center justify-between text-sm"
                      >
                        <span className="text-muted">{row.currency}</span>
                        <span className="font-mono text-primary">
                          {formatMoney(row.amount, row.currency)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Admin() {
  const { user: currentUser } = useAuth();
  const { notify } = useToast();

  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [query, setQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const [busyId, setBusyId] = useState(null);
  const [viewingId, setViewingId] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [creating, setCreating] = useState(false);

  const refresh = useCallback((q) => {
    return Promise.all([listAdminUsers(q), getAdminStats()]).then(
      ([userList, statsData]) => {
        setUsers(userList);
        setStats(statsData);
      }
    );
  }, []);

  useEffect(() => {
    setLoading(true);
    setLoadError("");

    refresh(query)
      .catch((err) =>
        setLoadError(getErrorMessage(err, "Could not load users."))
      )
      .finally(() => setLoading(false));
  }, [refresh, query]);

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    setQuery(searchInput.trim());
  };

  const handleUserCreated = () => {
    setCreating(false);
    refresh(query).catch(() => {});
  };

  const handleToggleActive = async (targetUser) => {
    setBusyId(targetUser.id);

    try {
      const updated = await updateAdminUser(targetUser.id, {
        is_active: !targetUser.is_active,
      });

      setUsers((current) =>
        current.map((u) => (u.id === targetUser.id ? { ...u, ...updated } : u))
      );

      notify(
        updated.is_active
          ? `${targetUser.username} reactivated.`
          : `${targetUser.username} deactivated.`
      );
    } catch (err) {
      notify(getErrorMessage(err, "Could not update user."), {
        type: "error",
      });
    } finally {
      setBusyId(null);
    }
  };

  const handleToggleAdmin = async (targetUser) => {
    setBusyId(targetUser.id);

    try {
      const updated = await updateAdminUser(targetUser.id, {
        is_admin: !targetUser.is_admin,
      });

      setUsers((current) =>
        current.map((u) => (u.id === targetUser.id ? { ...u, ...updated } : u))
      );

      notify(
        updated.is_admin
          ? `${targetUser.username} is now an admin.`
          : `${targetUser.username} is no longer an admin.`
      );
    } catch (err) {
      notify(getErrorMessage(err, "Could not update user."), {
        type: "error",
      });
    } finally {
      setBusyId(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return;

    setDeleteSubmitting(true);

    try {
      await deleteAdminUser(pendingDelete.id);
      setUsers((current) => current.filter((u) => u.id !== pendingDelete.id));
      notify(`${pendingDelete.username} deleted.`);
      setPendingDelete(null);
    } catch (err) {
      notify(getErrorMessage(err, "Could not delete user."), {
        type: "error",
      });
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const isSelf = (targetUser) => targetUser.id === currentUser?.id;

  const rows = useMemo(() => users, [users]);

  return (
    <div className="min-h-screen bg-page px-6 py-8 sm:px-10 sm:py-10">
      <div className="mx-auto max-w-5xl">
        <header className="flex flex-wrap items-start justify-between gap-5">
          <div className="flex items-start gap-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-accent-border bg-accent-subtle text-accent">
              <ShieldCheck size={19} strokeWidth={1.8} />
            </div>

            <div>
              <p className="mb-0.5 font-mono text-[10px] uppercase tracking-[0.15em] text-muted">
                Administration
              </p>
              <h1 className="text-xl font-semibold tracking-tight text-primary">
                Admin panel
              </h1>
              <p className="mt-1 text-sm text-muted">
                Manage every registered user.
              </p>
            </div>
          </div>

          <Button
            variant="accent"
            size="sm"
            icon={UserPlus}
            onClick={() => setCreating((v) => !v)}
          >
            Add user
          </Button>
        </header>

        {creating && (
          <CreateUserForm
            onCancel={() => setCreating(false)}
            onCreated={handleUserCreated}
            notify={notify}
          />
        )}

        {stats && (
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <StatCard icon={Users} label="Users" value={stats.total_users} />
            <StatCard
              icon={ShieldCheck}
              label="Admins"
              value={stats.total_admins}
            />
            <StatCard
              icon={CheckCircle2}
              label="Active"
              value={stats.active_users}
            />
            <StatCard
              icon={Wallet}
              label="Expenses"
              value={stats.total_expenses}
            />
            <StatCard
              icon={Wallet}
              label="Budgets"
              value={stats.total_budgets}
            />
            <StatCard icon={Target} label="Goals" value={stats.total_goals} />
          </div>
        )}

        <form
          onSubmit={handleSearchSubmit}
          className="mt-7 flex items-center gap-3"
        >
          <div className="flex flex-1 items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2">
            <Search size={15} className="text-faint" />
            <input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search by username or email..."
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
            <div className="flex justify-center rounded-xl border border-border bg-surface py-16">
              <Spinner size={20} />
            </div>
          ) : loadError ? (
            <EmptyState
              icon={AlertTriangle}
              title="Could not load users"
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
          ) : rows.length === 0 ? (
            <EmptyState icon={Users} title="No users found" />
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border bg-surface shadow-[0_4px_16px_rgba(32,37,34,0.03)]">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-xs uppercase tracking-wide text-faint">
                    <th className="px-4 py-3 font-medium">User</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Role</th>
                    <th className="px-4 py-3 font-medium">Joined</th>
                    <th className="px-4 py-3 font-medium text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b border-border last:border-0 hover:bg-surface-hover"
                    >
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => setViewingId(row.id)}
                          className="text-left"
                        >
                          <p className="font-medium text-primary hover:underline">
                            {row.username}
                          </p>
                          <p className="text-xs text-faint">
                            {row.email || "—"}
                          </p>
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={row.is_active ? "accent" : "danger"}>
                          {row.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={row.is_admin ? "accent" : "muted"}>
                          {row.is_admin ? "Admin" : "User"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-secondary">
                        {formatDate(row.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1.5">
                          <button
                            type="button"
                            title={
                              isSelf(row)
                                ? "You can't deactivate your own account"
                                : row.is_active
                                  ? "Deactivate"
                                  : "Reactivate"
                            }
                            disabled={isSelf(row) || busyId === row.id}
                            onClick={() => handleToggleActive(row)}
                            className="rounded-md p-1.5 text-muted transition-colors hover:bg-surface-hover hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            {row.is_active ? (
                              <Ban size={15} />
                            ) : (
                              <CheckCircle2 size={15} />
                            )}
                          </button>

                          <button
                            type="button"
                            title={
                              isSelf(row)
                                ? "You can't revoke your own admin access"
                                : row.is_admin
                                  ? "Revoke admin"
                                  : "Make admin"
                            }
                            disabled={isSelf(row) || busyId === row.id}
                            onClick={() => handleToggleAdmin(row)}
                            className="rounded-md p-1.5 text-muted transition-colors hover:bg-surface-hover hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            {row.is_admin ? (
                              <ShieldOff size={15} />
                            ) : (
                              <Shield size={15} />
                            )}
                          </button>

                          <button
                            type="button"
                            title={
                              isSelf(row)
                                ? "You can't delete your own account"
                                : "Delete user"
                            }
                            disabled={isSelf(row) || busyId === row.id}
                            onClick={() => setPendingDelete(row)}
                            className="rounded-md p-1.5 text-danger transition-colors hover:bg-danger-subtle disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {viewingId && (
        <UserDetailPanel
          userId={viewingId}
          notify={notify}
          onClose={() => setViewingId(null)}
        />
      )}

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete this user?"
        description={
          pendingDelete
            ? `This permanently deletes "${pendingDelete.username}" and all of their data — expenses, budgets, goals, categories, and conversations. This can't be undone.`
            : ""
        }
        confirmLabel="Delete"
        loading={deleteSubmitting}
        onCancel={() => setPendingDelete(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
