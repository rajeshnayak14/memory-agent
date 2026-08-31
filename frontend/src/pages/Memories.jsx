import { useCallback, useEffect, useState } from "react";
import { Brain, Plus, Trash2, AlertTriangle, Database } from "lucide-react";
import {
  listMemories,
  createMemory,
  updateMemory,
  deleteMemory,
  deleteAllMemories,
} from "../api/memories";
import { getErrorMessage } from "../utils/errorMessage";
import { useToast } from "../context/ToastContext";
import Button from "../components/Button";
import Spinner from "../components/Spinner";
import EmptyState from "../components/EmptyState";
import ConfirmDialog from "../components/ConfirmDialog";
import MemoryEditor from "../components/MemoryEditor";
import MemoryRow from "../components/MemoryRow";

export default function Memories() {
  const { notify } = useToast();

  const [memories, setMemories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [creating, setCreating] = useState(false);
  const [createSubmitting, setCreateSubmitting] = useState(false);

  const [updatingKey, setUpdatingKey] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);

  const refresh = useCallback(() => {
    return listMemories().then((data) => {
      setMemories(data.memories);
    });
  }, []);

  useEffect(() => {
    setLoading(true);

    refresh()
      .catch((err) =>
        setLoadError(
          getErrorMessage(
            err,
            "Could not load memories."
          )
        )
      )
      .finally(() => setLoading(false));
  }, [refresh]);

  const handleCreate = async (content) => {
    setCreateSubmitting(true);

    try {
      await createMemory(content);
      await refresh();
      setCreating(false);
      notify("Memory created.");
    } catch (err) {
      notify(
        getErrorMessage(
          err,
          "Could not create memory."
        ),
        { type: "error" }
      );
    } finally {
      setCreateSubmitting(false);
    }
  };

  const handleUpdate = async (key, content) => {
    setUpdatingKey(key);

    try {
      await updateMemory(key, content);
      await refresh();
      notify("Memory updated.");
    } catch (err) {
      notify(
        getErrorMessage(
          err,
          "Could not update memory."
        ),
        { type: "error" }
      );
      throw err;
    } finally {
      setUpdatingKey(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return;

    setDeleteSubmitting(true);

    try {
      await deleteMemory(pendingDelete.key);
      await refresh();
      notify("Memory deleted.");
      setPendingDelete(null);
    } catch (err) {
      notify(
        getErrorMessage(
          err,
          "Could not delete memory."
        ),
        { type: "error" }
      );
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const handleConfirmDeleteAll = async () => {
    setDeleteSubmitting(true);

    try {
      await deleteAllMemories();
      await refresh();
      notify("All memories deleted.");
      setConfirmDeleteAll(false);
    } catch (err) {
      notify(
        getErrorMessage(
          err,
          "Could not delete memories."
        ),
        { type: "error" }
      );
    } finally {
      setDeleteSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-page px-6 py-8 sm:px-10 sm:py-10">

      <div className="mx-auto max-w-4xl">

        {/* Header */}
        <header className="flex flex-wrap items-start justify-between gap-5">

          <div className="flex items-start gap-3.5">

            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-accent-border bg-accent-subtle text-accent">
              <Brain size={19} strokeWidth={1.8} />
            </div>

            <div>
              <p className="mb-0.5 font-mono text-[10px] uppercase tracking-[0.15em] text-muted">
                Knowledge store
              </p>

              <h1 className="text-xl font-semibold tracking-tight text-primary">
                Memories
              </h1>

              <p className="mt-1 text-sm text-muted">
                {loading
                  ? "Loading…"
                  : `${memories.length} stored`}
              </p>
            </div>

          </div>

          <div className="flex gap-2">

            {memories.length > 0 && (
              <Button
                variant="danger"
                size="sm"
                icon={Trash2}
                onClick={() =>
                  setConfirmDeleteAll(true)
                }
              >
                Delete all
              </Button>
            )}

            <Button
              variant="accent"
              size="sm"
              icon={Plus}
              onClick={() =>
                setCreating((v) => !v)
              }
            >
              New memory
            </Button>

          </div>
        </header>


        {/* Create memory */}
        {creating && (
          <div className="mt-6 rounded-xl border border-border bg-surface p-4 shadow-[0_4px_16px_rgba(32,37,34,0.04)]">

            <div className="mb-3 flex items-center gap-2 px-1">
              <Database
                size={14}
                className="text-accent"
                strokeWidth={1.8}
              />

              <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
                Add to memory
              </p>
            </div>

            <MemoryEditor
              autoFocus
              saveLabel="Create memory"
              submitting={createSubmitting}
              onCancel={() =>
                setCreating(false)
              }
              onSave={handleCreate}
            />

          </div>
        )}


        {/* Memory list */}
        <div className="mt-7">

          {loading ? (
            <div className="flex justify-center rounded-xl border border-border bg-surface py-16">
              <Spinner size={20} />
            </div>

          ) : loadError ? (

            <EmptyState
              icon={AlertTriangle}
              title="Could not load memories"
              description={loadError}
              action={
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    window.location.reload()
                  }
                >
                  Try again
                </Button>
              }
            />

          ) : memories.length === 0 ? (

            <EmptyState
              icon={Brain}
              title="No memories yet"
              description="Anything worth remembering from your conversations will show up here, or you can add one directly."
            />

          ) : (

            <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-[0_4px_16px_rgba(32,37,34,0.03)]">

              <div className="flex items-center justify-between border-b border-border px-4 py-3">

                <div className="flex items-center gap-2">
                  <Database
                    size={14}
                    className="text-muted"
                    strokeWidth={1.8}
                  />

                  <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
                    Stored memories
                  </span>
                </div>

                <span className="font-mono text-[10px] text-faint">
                  {memories.length}
                </span>

              </div>

              {memories.map((memory) => (
                <MemoryRow
                  key={memory.key}
                  memory={memory}
                  updating={
                    updatingKey === memory.key
                  }
                  onUpdate={handleUpdate}
                  onDelete={setPendingDelete}
                />
              ))}

            </div>
          )}

        </div>


        {/* Delete one */}
        <ConfirmDialog
          open={Boolean(pendingDelete)}
          title="Delete this memory?"
          description="This can't be undone. The agent will no longer recall this information."
          confirmLabel="Delete"
          loading={deleteSubmitting}
          onCancel={() =>
            setPendingDelete(null)
          }
          onConfirm={handleConfirmDelete}
        />


        {/* Delete all */}
        <ConfirmDialog
          open={confirmDeleteAll}
          title="Delete all memories?"
          description={`This permanently removes all ${memories.length} stored memories. This can't be undone.`}
          confirmLabel="Delete all"
          loading={deleteSubmitting}
          onCancel={() =>
            setConfirmDeleteAll(false)
          }
          onConfirm={handleConfirmDeleteAll}
        />

      </div>
    </div>
  );
}