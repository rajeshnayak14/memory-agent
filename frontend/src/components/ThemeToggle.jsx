import { Sun, Moon } from "lucide-react";
import { useTheme } from "../context/ThemeContext";

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      aria-label="Toggle theme"
      className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface text-muted shadow-panel transition-colors hover:text-accent"
    >
      {theme === "dark" ? (
        <Sun size={15} strokeWidth={1.9} />
      ) : (
        <Moon size={15} strokeWidth={1.9} />
      )}
    </button>
  );
}
