import { useCallback, useEffect, useMemo, useState } from "react";
import { Tag, Plus, AlertTriangle } from "lucide-react";

import {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from "../api/categories";
import { getExpenseBreakdown } from "../api/expenses";
import { getErrorMessage } from "../utils/errorMessage";
import { useToast } from "../context/ToastContext";

import Button from "../components/Button";
import Spinner from "../components/Spinner";
import EmptyState from "../components/EmptyState";
import ConfirmDialog from "../components/ConfirmDialog";
import CategoryEditor from "../components/CategoryEditor";
import CategoryRow from "../components/CategoryRow";

export default function Categories() {
  const { notify } = useToast();

  const [categories, setCategories] = useState([]);
  const [breakdown, setBreakdown] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [creating, setCreating] = useState(false);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

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

  const spentByCategory = useMemo(() => {
    const map = {};
    for (const entry of breakdown) {
      const key = entry.category.toLowerCase();
      if (!map[key]) map[key] = entry;
    }
    return map;
  }, [breakdown]);

  const handleCreate = async (payload) => {
    setCreateSubmitting(true);
    try {
      await createCategory(payload);
      await refresh();
      setCreating(false);
      notify("Category created.");
    } catch (err) {
      notify(getErrorMessage(err, "Could not create category."), {
        type: "error",
      });
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
      notify(getErrorMessage(err, "Could not update category."), {
        type: "error",
      });
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
      notify(getErrorMessage(err, "Could not delete category."), {
        type: "error",
      });
    } finally {
      setDeleteSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-page px-6 py-8 sm:px-10 sm:py-10">
      <div className="mx-auto max-w-3xl">
        <header className="flex flex-wrap items-start justify-between gap-5">
          <div className="flex items-start gap-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-accent-border bg-accent-subtle text-accent">
              <Tag size={19} strokeWidth={1.8} />
            </div>
            <div>
              <p className="mb-0.5 font-mono text-[10px] uppercase tracking-[0.15em] text-muted">
                Reference list
              </p>
              <h1 className="text-xl font-semibold tracking-tight text-primary">
                Categories
              </h1>
              <p className="mt-1 text-sm text-muted">
                {loading ? "Loading…" : `${categories.length} defined`}
              </p>
            </div>
          </div>

          <Button
            variant="accent"
            size="sm"
            icon={Plus}
            onClick={() => setCreating((v) => !v)}
          >
            New category
          </Button>
        </header>

        {creating && (
          <div className="mt-6">
            <CategoryEditor
              submitting={createSubmitting}
              saveLabel="Create category"
              onCancel={() => setCreating(false)}
              onSave={handleCreate}
            />
          </div>
        )}

        <div className="mt-7">
          {loading ? (
            <div className="flex justify-center rounded-xl border border-border bg-surface py-16">
              <Spinner size={20} />
            </div>
          ) : loadError ? (
            <EmptyState
              icon={AlertTriangle}
              title="Could not load categories"
              description={loadError}
            />
          ) : categories.length === 0 ? (
            <EmptyState
              icon={Tag}
              title="No categories yet"
              description="Define a few to keep your expense categories consistent — this doesn't change how the assistant categorizes anything you tell it in chat."
            />
          ) : (
            <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-[0_4px_16px_rgba(32,37,34,0.03)]">
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
          )}
        </div>

        <ConfirmDialog
          open={Boolean(pendingDelete)}
          title="Delete this category?"
          description="This only removes it from your reference list — past expenses keep their original category label."
          confirmLabel="Delete"
          loading={deleteSubmitting}
          onCancel={() => setPendingDelete(null)}
          onConfirm={handleConfirmDelete}
        />
      </div>
    </div>
  );
}
