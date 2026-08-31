import { useState } from "react";
import { Pencil, Trash2, Tag as TagIcon } from "lucide-react";
import { formatMoney } from "../utils/currency";
import CategoryEditor, { CATEGORY_ICONS } from "./CategoryEditor";

export default function CategoryRow({
  category,
  spent,
  onUpdate,
  onDelete,
  updating,
}) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <div className="border-b border-border px-4 py-4 last:border-b-0">
        <CategoryEditor
          initial={category}
          submitting={updating}
          saveLabel="Save changes"
          onCancel={() => setEditing(false)}
          onSave={(changes) =>
            onUpdate(category.id, changes).then(() => setEditing(false))
          }
        />
      </div>
    );
  }

  const Icon = CATEGORY_ICONS[category.icon] || TagIcon;

  return (
    <div className="group flex items-center gap-3 border-b border-border bg-surface px-4 py-3.5 transition-colors last:border-b-0 hover:bg-surface-hover">
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
        style={{ backgroundColor: `${category.color}22`, color: category.color }}
      >
        <Icon size={16} strokeWidth={1.8} />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-primary">
          {category.name}
        </p>

        {spent != null && (
          <p className="text-xs text-muted">
            {formatMoney(spent.amount, spent.currency)} spent
          </p>
        )}
      </div>

      <div className="flex shrink-0 gap-1 opacity-100 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100">
        <button
          type="button"
          onClick={() => setEditing(true)}
          aria-label="Edit category"
          className="rounded-lg p-2 text-faint transition-colors hover:bg-accent-subtle hover:text-accent"
        >
          <Pencil size={15} strokeWidth={1.9} />
        </button>

        <button
          type="button"
          onClick={() => onDelete(category)}
          aria-label="Delete category"
          className="rounded-lg p-2 text-faint transition-colors hover:bg-danger-subtle hover:text-danger"
        >
          <Trash2 size={15} strokeWidth={1.9} />
        </button>
      </div>
    </div>
  );
}
