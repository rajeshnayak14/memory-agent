import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { formatDate } from "../utils/formatDate";
import MemoryEditor from "./MemoryEditor";

export default function MemoryRow({
  memory,
  onUpdate,
  onDelete,
  updating,
}) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <div className="border-b border-border px-4 py-4 last:border-b-0">
        <MemoryEditor
          initialValue={memory.content}
          submitting={updating}
          autoFocus
          saveLabel="Save changes"
          onCancel={() => setEditing(false)}
          onSave={(content) =>
            onUpdate(memory.key, content).then(() =>
              setEditing(false)
            )
          }
        />
      </div>
    );
  }

  return (
    <div className="group flex items-start gap-4 border-b border-border bg-surface px-4 py-4 transition-colors last:border-b-0 hover:bg-surface-hover">

      <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-success" />

      <div className="min-w-0 flex-1">
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-primary">
          {memory.content}
        </p>

        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[10px] uppercase tracking-[0.05em] text-faint">
          <span>
            created {formatDate(memory.created_at)}
          </span>

          {memory.updated_at !== memory.created_at && (
            <span>
              updated {formatDate(memory.updated_at)}
            </span>
          )}
        </div>
      </div>

      <div className="flex shrink-0 gap-1 opacity-100 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100">

        <button
          type="button"
          onClick={() => setEditing(true)}
          aria-label="Edit memory"
          className="rounded-lg p-2 text-faint transition-colors hover:bg-accent-subtle hover:text-accent"
        >
          <Pencil
            size={15}
            strokeWidth={1.9}
          />
        </button>

        <button
          type="button"
          onClick={() => onDelete(memory)}
          aria-label="Delete memory"
          className="rounded-lg p-2 text-faint transition-colors hover:bg-danger-subtle hover:text-danger"
        >
          <Trash2
            size={15}
            strokeWidth={1.9}
          />
        </button>

      </div>
    </div>
  );
}