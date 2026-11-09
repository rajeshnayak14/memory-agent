import { useCallback, useEffect, useMemo, useState } from "react";
import { Tag, Plus, AlertTriangle, Sparkles, Trash2 } from "lucide-react";

import {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from "../api/categories";
import { clearExpenseCategory, getExpenseBreakdown } from "../api/expenses";
import { getErrorMessage } from "../utils/errorMessage";
import { useToast } from "../context/ToastContext";
import { formatMoney } from "../utils/currency";

import Button from "../components/Button";
import Spinner from "../components/Spinner";
import EmptyState from "../components/EmptyState";
import ConfirmDialog from "../components/ConfirmDialog";
import CategoryEditor from "../components/CategoryEditor";
import CategoryRow from "../components/CategoryRow";

// Row for a category that exists in expenses but hasn't been registered yet.
function UnregisteredRow({ entry, onRegister, onDelete, selected, onSelect }) {
  return (
    <div className={`group flex items-center gap-3 border-b border-border px-4 py-3.5 last:border-b-0 transition-colors ${selected ? "bg-accent-subtle" : "bg-surface hover:bg-surface-hover"}`}>
      <input
        type="checkbox"
        checked={selected}
        onChange={() => onSelect(entry.category)}
        aria-label={`Select ${entry.category}`}
        className="h-4 w-4 shrink-0 cursor-pointer accent-accent"
      />

      <div className="icon-blob flex h-9 w-9 shrink-0 items-center justify-center bg-surface-subtle text-faint">
        <Tag size={16} strokeWidth={1.8} />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium capitalize text-primary">
          {entry.category}
        </p>
        <p className="text-xs text-muted">
          {formatMoney(entry.amount, entry.currency)} spent · not registered
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={() => onRegister(entry.category)}
          title="Register this category"
          className="flex items-center gap-1.5 rounded-2xl border border-accent-border bg-accent-subtle px-3 py-1.5 text-xs font-medium text-accent opacity-0 transition-colors hover:bg-accent/10 group-hover:opacity-100"
        >
          <Plus size={13} strokeWidth={2} />
          Register
        </button>

        <button
          type="button"
          onClick={() => onDelete(entry.category)}
          title="Remove category label"
          className="rounded-full p-2 text-faint opacity-0 transition-colors hover:bg-danger-subtle hover:text-danger group-hover:opacity-100"
        >
          <Trash2 size={15} strokeWidth={1.9} />
        </button>
      </div>
    </div>
  );
}

export default function Categories() {
  const { notify } = useToast();

  const [categories, setCategories] = useState([]);
  const [breakdown, setBreakdown] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  // create state: false | true | "prefill:<name>"
  const [creating, setCreating] = useState(false);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  // unregistered multi-select
  const [selectedUnreg, setSelectedUnreg] = useState(new Set());
  const [pendingClear, setPendingClear] = useState(null); // single category name or "bulk"
  const [clearSubmitting, setClearSubmitting] = useState(false);

  const refresh = useCallback(() => {
    return Promise.all([
      listCategories().then((data) => setCategories(data.categories)),
      getExpenseBreakdown().then((data) => setBreakdown(data.breakdown)),
    ]);
  }, []);

  useEffect(() => {
    setLoading(true);
    refresh()
      .catch((err) =>
        setLoadError(getErrorMessage(err, "Could not load categories."))
      )
      .finally(() => setLoading(false));
  }, [refresh]);

  // Map: lowercase category name → breakdown entry
  const spentByCategory = useMemo(() => {
    const map = {};
    for (const entry of breakdown) {
      const key = entry.category.toLowerCase();
      if (!map[key]) map[key] = entry;
    }
    return map;
  }, [breakdown]);

  // Registered names (lowercase) for fast lookup
  const registeredNames = useMemo(
    () => new Set(categories.map((c) => c.name.toLowerCase())),
    [categories]
  );

  // Expense categories that have no matching registered category
  const unregistered = useMemo(
    () => breakdown.filter((e) => !registeredNames.has(e.category.toLowerCase())),
    [breakdown, registeredNames]
  );

  const handleCreate = async (payload) => {
    setCreateSubmitting(true);
    try {
      await createCategory(payload);
      await refresh();
      setCreating(false);
      notify("Category created.");
    } catch (err) {
      notify(getErrorMessage(err, "Could not create category."), { type: "error" });
    } finally {
      setCreateSubmitting(false);
    }
  };

  const handleUpdate = async (id, changes) => {
    setUpdatingId(id);
    try {
      await updateCategory(id, changes);
      await refresh();
      notify("Category updated.");
    } catch (err) {
      notify(getErrorMessage(err, "Could not update category."), { type: "error" });
      throw err;
    } finally {
      setUpdatingId(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleteSubmitting(true);
    try {
      await deleteCategory(pendingDelete.id);
      await refresh();
      notify("Category deleted.");
      setPendingDelete(null);
    } catch (err) {
      notify(getErrorMessage(err, "Could not delete category."), { type: "error" });
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const toggleUnreg = (name) =>
    setSelectedUnreg((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });

  const toggleAllUnreg = () =>
    setSelectedUnreg((prev) =>
      prev.size === unregistered.length
        ? new Set()
        : new Set(unregistered.map((e) => e.category))
    );

  const handleConfirmClear = async () => {
    if (!pendingClear) return;
    setClearSubmitting(true);
    const targets =
      pendingClear === "bulk" ? [...selectedUnreg] : [pendingClear];
    try {
      await Promise.all(targets.map((cat) => clearExpenseCategory(cat)));
      await refresh();
      setSelectedUnreg(new Set());
      notify(
        targets.length === 1
          ? `"${targets[0]}" removed.`
          : `${targets.length} categories removed.`
      );
      setPendingClear(null);
    } catch (err) {
      notify(getErrorMessage(err, "Could not remove category."), { type: "error" });
    } finally {
      setClearSubmitting(false);
    }
  };

  // Open the create form pre-filled with an expense category name
  const handleRegister = (name) => {
    setCreating({ prefill: name });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const totalCategories = categories.length + unregistered.length;

  return (
    <div className="min-h-screen bg-page px-6 py-8 sm:px-10 sm:py-10">
      <div className="mx-auto max-w-3xl">

        {/* Header */}
        <header className="flex flex-wrap items-start justify-between gap-5">
          <div className="flex items-start gap-3.5">
            <div className="icon-blob flex h-10 w-10 shrink-0 items-center justify-center bg-accent-subtle text-accent">
              <Tag size={19} strokeWidth={1.8} />
            </div>
            <div>
              <p className="mb-0.5 text-sm text-muted">Expense categories</p>
              <h1 className="font-heading text-2xl font-semibold tracking-tight text-primary">
                Categories
              </h1>
              <p className="mt-1 text-sm text-muted">
                {loading
                  ? "Loading…"
                  : `${categories.length} registered · ${unregistered.length} from expenses`}
              </p>
            </div>
          </div>

          <Button
            variant="accent"
            size="sm"
            icon={Plus}
            onClick={() => setCreating(true)}
          >
            New category
          </Button>
        </header>

        {/* Create form */}
        {creating && (
          <div className="mt-6">
            <CategoryEditor
              initial={typeof creating === "object" ? { name: creating.prefill } : {}}
              submitting={createSubmitting}
              saveLabel="Create category"
              onCancel={() => setCreating(false)}
              onSave={handleCreate}
            />
          </div>
        )}

        <div className="mt-7 space-y-6">
          {loading ? (
            <div className="flex justify-center rounded-3xl border border-border bg-surface py-16">
              <Spinner size={20} />
            </div>
          ) : loadError ? (
            <EmptyState
              icon={AlertTriangle}
              title="Could not load categories"
              description={loadError}
            />
          ) : totalCategories === 0 ? (
            <EmptyState
              icon={Tag}
              title="No categories yet"
              description="Log an expense in chat and categories will appear here automatically."
            />
          ) : (
            <>
              {/* Registered categories */}
              {categories.length > 0 && (
                <section>
                  <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-widest text-faint">
                    Registered ({categories.length})
                  </p>
                  <div className="overflow-hidden rounded-3xl border border-border bg-surface shadow-soft dark:shadow-none">
                    {categories.map((category) => (
                      <CategoryRow
                        key={category.id}
                        category={category}
                        spent={spentByCategory[category.name.toLowerCase()]}
                        updating={updatingId === category.id}
                        onUpdate={handleUpdate}
                        onDelete={setPendingDelete}
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* Unregistered — from expenses only */}
              {unregistered.length > 0 && (
                <section>
                  <div className="mb-2 flex items-center justify-between gap-2 px-1">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-semibold uppercase tracking-widest text-faint">
                        From expenses ({unregistered.length})
                      </p>
                      <Sparkles size={11} strokeWidth={1.8} className="text-faint" />
                    </div>
                    <div className="flex items-center gap-2">
                      {selectedUnreg.size > 0 && (
                        <button
                          type="button"
                          onClick={() => setPendingClear("bulk")}
                          className="flex items-center gap-1.5 rounded-2xl bg-danger px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-danger/90"
                        >
                          <Trash2 size={12} strokeWidth={2} />
                          Remove {selectedUnreg.size}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={toggleAllUnreg}
                        className="text-xs text-muted transition-colors hover:text-primary"
                      >
                        {selectedUnreg.size === unregistered.length ? "Deselect all" : "Select all"}
                      </button>
                    </div>
                  </div>
                  <p className="mb-3 px-1 text-xs text-muted">
                    These categories were created by the agent. Register them to assign an icon and colour.
                  </p>
                  <div className="overflow-hidden rounded-3xl border border-border bg-surface shadow-soft dark:shadow-none">
                    {unregistered.map((entry) => (
                      <UnregisteredRow
                        key={entry.category}
                        entry={entry}
                        onRegister={handleRegister}
                        onDelete={(name) => setPendingClear(name)}
                        selected={selectedUnreg.has(entry.category)}
                        onSelect={toggleUnreg}
                      />
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </div>

      </div>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete this category?"
        description="This only removes it from your registered list — past expenses keep their original category label."
        confirmLabel="Delete"
        loading={deleteSubmitting}
        onCancel={() => setPendingDelete(null)}
        onConfirm={handleConfirmDelete}
      />

      <ConfirmDialog
        open={Boolean(pendingClear)}
        title={
          pendingClear === "bulk"
            ? `Remove ${selectedUnreg.size} categories?`
            : `Remove "${pendingClear}"?`
        }
        description="Expenses are kept — only the category label is cleared. They will appear as uncategorized."
        confirmLabel="Remove"
        loading={clearSubmitting}
        onCancel={() => setPendingClear(null)}
        onConfirm={handleConfirmClear}
      />
    </div>
  );
}
