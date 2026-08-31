import { useCallback, useEffect, useState } from "react";
import { Target, Plus, AlertTriangle } from "lucide-react";

import {
  listGoals,
  createGoal,
  contributeToGoal,
  deleteGoal,
} from "../api/goals";
import { getErrorMessage } from "../utils/errorMessage";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

import Button from "../components/Button";
import Spinner from "../components/Spinner";
import EmptyState from "../components/EmptyState";
import ConfirmDialog from "../components/ConfirmDialog";
import GoalEditor from "../components/GoalEditor";
import GoalCard from "../components/GoalCard";

export default function Goals() {
  const { user } = useAuth();
  const { notify } = useToast();
  const defaultCurrency = user.preferred_currency || "INR";

  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [creating, setCreating] = useState(false);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [contributingId, setContributingId] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  const refresh = useCallback(() => {
    return listGoals().then((data) => setGoals(data.goals));
  }, []);

  useEffect(() => {
    setLoading(true);
    refresh()
      .catch((err) => setLoadError(getErrorMessage(err, "Could not load goals.")))
      .finally(() => setLoading(false));
  }, [refresh]);

  const handleCreate = async (payload) => {
    setCreateSubmitting(true);
    try {
      await createGoal(payload);
      await refresh();
      setCreating(false);
      notify("Goal created.");
    } catch (err) {
      notify(getErrorMessage(err, "Could not create goal."), { type: "error" });
    } finally {
      setCreateSubmitting(false);
    }
  };

  const handleContribute = async (goalId, amount) => {
    setContributingId(goalId);
    try {
      await contributeToGoal(goalId, amount);
      await refresh();
      notify(amount > 0 ? "Funds added." : "Funds withdrawn.");
    } catch (err) {
      notify(getErrorMessage(err, "Could not update goal."), { type: "error" });
    } finally {
      setContributingId(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleteSubmitting(true);
    try {
      await deleteGoal(pendingDelete.id);
      await refresh();
      notify("Goal deleted.");
      setPendingDelete(null);
    } catch (err) {
      notify(getErrorMessage(err, "Could not delete goal."), { type: "error" });
    } finally {
      setDeleteSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-page px-6 py-8 sm:px-10 sm:py-10">
      <div className="mx-auto max-w-5xl">
        <header className="flex flex-wrap items-start justify-between gap-5">
          <div className="flex items-start gap-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-accent-border bg-accent-subtle text-accent">
              <Target size={19} strokeWidth={1.8} />
            </div>
            <div>
              <p className="mb-0.5 font-mono text-[10px] uppercase tracking-[0.15em] text-muted">
                Savings targets
              </p>
              <h1 className="text-xl font-semibold tracking-tight text-primary">
                Goals
              </h1>
              <p className="mt-1 text-sm text-muted">
                {loading ? "Loading…" : `${goals.length} active`}
              </p>
            </div>
          </div>

          <Button
            variant="accent"
            size="sm"
            icon={Plus}
            onClick={() => setCreating((v) => !v)}
          >
            New goal
          </Button>
        </header>

        {creating && (
          <div className="mt-6">
            <GoalEditor
              defaultCurrency={defaultCurrency}
              submitting={createSubmitting}
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
              title="Could not load goals"
              description={loadError}
            />
          ) : goals.length === 0 ? (
            <EmptyState
              icon={Target}
              title="No goals yet"
              description="Set a savings target above and track your progress toward it."
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {goals.map((goal) => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  contributing={contributingId === goal.id}
                  onContribute={handleContribute}
                  onDelete={setPendingDelete}
                  deleting={pendingDelete?.id === goal.id && deleteSubmitting}
                />
              ))}
            </div>
          )}
        </div>

        <ConfirmDialog
          open={Boolean(pendingDelete)}
          title="Delete this goal?"
          description="This can't be undone."
          confirmLabel="Delete"
          loading={deleteSubmitting}
          onCancel={() => setPendingDelete(null)}
          onConfirm={handleConfirmDelete}
        />
      </div>
    </div>
  );
}
