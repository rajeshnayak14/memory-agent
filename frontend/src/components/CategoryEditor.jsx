import { useState } from "react";
import {
  Tag,
  ShoppingCart,
  UtensilsCrossed,
  Car,
  Home,
  Plane,
  Film,
  HeartPulse,
  GraduationCap,
  Wifi,
  Shirt,
  Gift,
} from "lucide-react";
import Button from "./Button";

export const CATEGORY_ICONS = {
  Tag,
  ShoppingCart,
  UtensilsCrossed,
  Car,
  Home,
  Plane,
  Film,
  HeartPulse,
  GraduationCap,
  Wifi,
  Shirt,
  Gift,
};

const SWATCHES = [
  "#1f4d3b",
  "#2a78d6",
  "#eb6834",
  "#4a3aa7",
  "#e87ba4",
  "#1baf7a",
  "#e34948",
  "#eda100",
];

const inputClass =
  "w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-primary outline-none transition-colors placeholder:text-faint focus:border-focus";

export default function CategoryEditor({
  initial = {},
  submitting = false,
  saveLabel = "Save",
  onSave,
  onCancel,
}) {
  const [name, setName] = useState(initial.name ?? "");
  const [icon, setIcon] = useState(initial.icon ?? "Tag");
  const [color, setColor] = useState(initial.color ?? SWATCHES[0]);
  const [error, setError] = useState("");

  const handleSave = () => {
    const trimmed = name.trim();

    if (!trimmed) {
      setError("Category name is required.");
      return;
    }

    setError("");
    onSave({ name: trimmed, icon, color });
  };

  return (
    <div className="rounded-xl border border-border bg-surface p-3">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Category name"
        className={inputClass}
      />

      <div className="mt-3">
        <p className="mb-1.5 text-xs font-medium text-muted">Icon</p>
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(CATEGORY_ICONS).map(([key, Icon]) => (
            <button
              key={key}
              type="button"
              onClick={() => setIcon(key)}
              aria-label={key}
              className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-colors ${
                icon === key
                  ? "border-accent-border bg-accent-subtle text-accent"
                  : "border-border text-muted hover:bg-surface-hover"
              }`}
            >
              <Icon size={15} strokeWidth={1.8} />
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3">
        <p className="mb-1.5 text-xs font-medium text-muted">Color</p>
        <div className="flex flex-wrap gap-1.5">
          {SWATCHES.map((swatch) => (
            <button
              key={swatch}
              type="button"
              onClick={() => setColor(swatch)}
              aria-label={swatch}
              className={`h-7 w-7 rounded-full ring-2 transition-shadow ${
                color === swatch ? "ring-primary" : "ring-transparent"
              }`}
              style={{ backgroundColor: swatch }}
            />
          ))}
        </div>
      </div>

      {error && <p className="mt-2 text-xs text-danger">{error}</p>}

      <div className="mt-3 flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>

        <Button variant="accent" size="sm" onClick={handleSave} loading={submitting}>
          {saveLabel}
        </Button>
      </div>
    </div>
  );
}
