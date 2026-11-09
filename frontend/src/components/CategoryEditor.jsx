import { useRef, useState } from "react";
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
  Pipette,
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
  "w-full rounded-2xl border border-border-strong bg-surface px-3 py-2 text-sm text-primary outline-none transition-colors placeholder:text-faint focus:border-focus";

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
  const [keywords, setKeywords] = useState(initial.keywords ?? "");
  const [error, setError] = useState("");
  const colorInputRef = useRef(null);

  const isCustomColor = !SWATCHES.includes(color);

  const handleSave = () => {
    const trimmed = name.trim();

    if (!trimmed) {
      setError("Category name is required.");
      return;
    }

    setError("");
    onSave({ name: trimmed, icon, color, keywords: keywords.trim() || null });
  };

  return (
    <div className="rounded-3xl border border-border bg-surface p-3">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Category name"
        className={inputClass}
      />

      <input
        type="text"
        value={keywords}
        onChange={(e) => setKeywords(e.target.value)}
        placeholder="Keywords (e.g. fruits, vegetables, supermarket)"
        className={`${inputClass} mt-2`}
      />
      <p className="mt-1 px-1 text-[11px] text-faint">
        Comma-separated terms the agent should map to this category
      </p>

      <div className="mt-3">
        <p className="mb-1.5 text-xs font-medium text-muted">Icon</p>
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(CATEGORY_ICONS).map(([key, Icon]) => (
            <button
              key={key}
              type="button"
              onClick={() => setIcon(key)}
              aria-label={key}
              className={`flex h-8 w-8 items-center justify-center rounded-2xl border transition-colors ${
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
        <div className="flex flex-wrap items-center gap-1.5">
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

          {/* Custom color picker */}
          <button
            type="button"
            onClick={() => colorInputRef.current?.click()}
            title="Custom color"
            className={`relative flex h-7 w-7 items-center justify-center rounded-full ring-2 transition-shadow ${
              isCustomColor ? "ring-primary" : "ring-transparent hover:ring-border"
            }`}
            style={{ backgroundColor: isCustomColor ? color : undefined }}
          >
            {!isCustomColor && (
              <span className="flex h-full w-full items-center justify-center rounded-full border border-dashed border-border text-faint">
                <Pipette size={12} strokeWidth={1.8} />
              </span>
            )}
            <input
              ref={colorInputRef}
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              aria-label="Custom color"
            />
          </button>
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
