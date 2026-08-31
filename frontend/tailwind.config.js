/** @type {import('tailwindcss').Config} */

function withOpacity(variable) {
  return `rgb(var(${variable}) / <alpha-value>)`;
}

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // Legacy token names, repointed at the shared CSS-variable palette
        // (see src/index.css) instead of static hex — every file still
        // using these (ConfirmDialog, ToastContext, Spinner, TextField,
        // ProtectedRoute) inherits dark mode and the green rebrand with
        // zero edits, including opacity modifiers like `bg-ink-900/40`.
        paper: withOpacity("--bg-page"),
        surface: withOpacity("--bg-surface"),
        border: {
          DEFAULT: withOpacity("--border-default"),
          strong: withOpacity("--border-strong"),
        },
        ink: {
          900: withOpacity("--text-primary"),
          700: withOpacity("--text-secondary"),
          500: withOpacity("--text-muted"),
          300: withOpacity("--text-faint"),
        },
        accent: {
          DEFAULT: withOpacity("--accent"),
          500: withOpacity("--accent"),
          hover: withOpacity("--accent-hover"),
          subtle: withOpacity("--accent-subtle-bg"),
          border: withOpacity("--accent-subtle-border"),
        },
        success: {
          DEFAULT: withOpacity("--success"),
          500: withOpacity("--success"),
        },
        danger: {
          DEFAULT: withOpacity("--danger"),
          500: withOpacity("--danger"),
          subtle: withOpacity("--danger-subtle-bg"),
          border: withOpacity("--danger-border"),
          100: withOpacity("--danger-subtle-bg"),
        },
        warn: {
          DEFAULT: withOpacity("--warn"),
        },

        // Plain aliases used by the arbitrary-hex -> token sweep.
        page: withOpacity("--bg-page"),
        "surface-hover": withOpacity("--bg-surface-hover"),
        "surface-subtle": withOpacity("--bg-surface-subtle"),
        primary: {
          DEFAULT: withOpacity("--text-primary"),
          hover: withOpacity("--primary-hover"),
        },
        secondary: withOpacity("--text-secondary"),
        muted: withOpacity("--text-muted"),
        faint: withOpacity("--text-faint"),
        focus: withOpacity("--border-focus"),
      },
      fontFamily: {
        sans: [
          '"IBM Plex Sans"',
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
        mono: [
          '"IBM Plex Mono"',
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Consolas",
          "monospace",
        ],
      },
      boxShadow: {
        panel: "0 1px 2px 0 rgba(27, 26, 22, 0.04)",
        raised: "0 2px 8px 0 rgba(27, 26, 22, 0.08)",
      },
    },
  },
  plugins: [],
};
