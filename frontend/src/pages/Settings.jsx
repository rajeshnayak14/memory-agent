import { useEffect, useState } from "react";
import {
  Settings as SettingsIcon,
  Palette,
  Wallet,
  Sun,
  Moon,
  ShieldCheck,
} from "lucide-react";

import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useToast } from "../context/ToastContext";
import { updateProfile } from "../api/auth";
import { getErrorMessage } from "../utils/errorMessage";
import { CURRENCY_CODES } from "../utils/currency";
import Button from "../components/Button";

export default function Settings() {
  const { user, refreshProfile } = useAuth();
  const { theme, setTheme } = useTheme();
  const { notify } = useToast();

  const [currency, setCurrency] = useState("INR");
  const [savingCurrency, setSavingCurrency] = useState(false);

  useEffect(() => {
    refreshProfile().catch(() => {});
  }, [refreshProfile]);

  useEffect(() => {
    if (user?.preferred_currency) {
      setCurrency(user.preferred_currency);
    }
  }, [user?.preferred_currency]);

  if (!user) return null;

  const currencyChanged = currency !== user.preferred_currency;

  const handleSaveCurrency = async () => {
    setSavingCurrency(true);
    try {
      await updateProfile({ preferredCurrency: currency });
      await refreshProfile();
      notify("Preferred currency updated.");
    } catch (err) {
      notify(getErrorMessage(err, "Could not update currency."), {
        type: "error",
      });
    } finally {
      setSavingCurrency(false);
    }
  };

  return (
    <div className="min-h-screen bg-page px-6 py-8 sm:px-10 sm:py-10">
      <div className="mx-auto max-w-2xl">
        <header>
          <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.15em] text-muted">
            Preferences
          </p>
          <h1 className="flex items-center gap-2.5 text-xl font-semibold tracking-tight text-primary">
            <SettingsIcon size={19} strokeWidth={1.8} />
            Settings
          </h1>
          <p className="mt-1 text-sm text-muted">
            App-level preferences for your account.
          </p>
        </header>

        <section className="mt-7 overflow-hidden rounded-xl border border-border bg-surface shadow-[0_4px_16px_rgba(32,37,34,0.03)]">
          <div className="flex items-center gap-2 border-b border-border px-5 py-3.5">
            <Wallet size={15} className="text-accent" strokeWidth={1.8} />
            <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
              Currency
            </p>
          </div>

          <div className="flex items-center justify-between gap-4 px-5 py-4">
            <div>
              <p className="text-sm font-medium text-primary">Preferred currency</p>
              <p className="mt-0.5 text-xs text-muted">
                Used as the default for new expenses, budgets, and goals.
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="rounded-lg border border-border-strong bg-surface px-2.5 py-1.5 text-sm text-primary outline-none transition-colors focus:border-focus"
              >
                {CURRENCY_CODES.map((code) => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))}
              </select>

              {currencyChanged && (
                <Button
                  variant="accent"
                  size="sm"
                  onClick={handleSaveCurrency}
                  loading={savingCurrency}
                >
                  Save
                </Button>
              )}
            </div>
          </div>
        </section>

        <section className="mt-6 overflow-hidden rounded-xl border border-border bg-surface shadow-[0_4px_16px_rgba(32,37,34,0.03)]">
          <div className="flex items-center gap-2 border-b border-border px-5 py-3.5">
            <Palette size={15} className="text-accent" strokeWidth={1.8} />
            <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
              Appearance
            </p>
          </div>

          <div className="flex items-center justify-between gap-4 px-5 py-4">
            <div>
              <p className="text-sm font-medium text-primary">Theme</p>
              <p className="mt-0.5 text-xs text-muted">
                Choose how Mnemos looks on this device.
              </p>
            </div>

            <div className="flex shrink-0 gap-1 rounded-lg border border-border-strong bg-surface-subtle p-1">
              <button
                type="button"
                onClick={() => setTheme("light")}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  theme === "light"
                    ? "bg-surface text-primary shadow-panel"
                    : "text-muted hover:text-primary"
                }`}
              >
                <Sun size={13} strokeWidth={1.9} />
                Light
              </button>

              <button
                type="button"
                onClick={() => setTheme("dark")}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  theme === "dark"
                    ? "bg-surface text-primary shadow-panel"
                    : "text-muted hover:text-primary"
                }`}
              >
                <Moon size={13} strokeWidth={1.9} />
                Dark
              </button>
            </div>
          </div>
        </section>

        <section className="mt-6 overflow-hidden rounded-xl border border-border bg-surface shadow-[0_4px_16px_rgba(32,37,34,0.03)]">
          <div className="flex items-center gap-2 border-b border-border px-5 py-3.5">
            <ShieldCheck size={15} className="text-accent" strokeWidth={1.8} />
            <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
              Account security
            </p>
          </div>

          <div className="flex items-center gap-3 px-5 py-4">
            <ShieldCheck size={16} className="shrink-0 text-accent" strokeWidth={1.8} />
            <p className="text-sm text-secondary">
              {user.email_verified
                ? `Your email (${user.email || "on file"}) is verified. Future logins just need your password.`
                : `${user.email || "Your email"} hasn't been verified yet — you'll be asked for a code the next time you log in.`}
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
