import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { LogIn, ShieldCheck, MailCheck } from "lucide-react";
import AuthLayout from "../layouts/AuthLayout";
import TextField from "../components/TextField";
import Button from "../components/Button";
import { useAuth } from "../context/AuthContext";
import { resendLoginOtp } from "../api/auth";
import { getErrorMessage } from "../utils/errorMessage";

export default function Login() {
  const { login, completeMfaLogin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({
    username: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [mfaToken, setMfaToken] = useState(null);
  const [code, setCode] = useState("");
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState("");

  const update = (field) => (event) =>
    setForm((prev) => ({
      ...prev,
      [field]: event.target.value,
    }));

  const goToRedirect = () => {
    const redirectTo =
      location.state?.from?.pathname ||
      "/dashboard";

    navigate(redirectTo, { replace: true });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setError("");

    try {
      const result = await login(form.username, form.password);

      if (result.mfaRequired) {
        setMfaToken(result.mfaToken);
        return;
      }

      goToRedirect();
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          "Unable to sign in. Please try again."
        )
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyOtp = async (event) => {
    event.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setError("");

    try {
      await completeMfaLogin(mfaToken, code);
      goToRedirect();
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          "Invalid or expired code. Please try again."
        )
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    setResendMessage("");
    setError("");

    try {
      await resendLoginOtp(mfaToken);
      setResendMessage("A new code has been sent.");
    } catch (err) {
      setError(getErrorMessage(err, "Could not resend the code."));
    } finally {
      setResending(false);
    }
  };

  if (mfaToken) {
    return (
      <AuthLayout>
        <div className="mb-7 flex items-center gap-3">
          <img src="/logo.png" alt="Mnemos" className="h-10 w-10" />

          <div>
            <p className="text-base font-semibold tracking-tight text-primary">
              Mnemos
            </p>
            <p className="font-mono text-[9px] uppercase tracking-[0.13em] text-muted">
              Your AI Finance Assistant
            </p>
          </div>
        </div>

        <h1 className="flex items-center gap-2.5 text-xl font-semibold tracking-tight text-primary">
          <MailCheck size={19} strokeWidth={1.8} />
          Check your email
        </h1>

        <p className="mt-1.5 text-sm text-muted">
          Enter the 6-digit code we just sent to finish signing in.
        </p>

        <form
          onSubmit={handleVerifyOtp}
          className="mt-7 flex flex-col gap-4"
        >
          <TextField
            id="otp-code"
            label="Verification code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            autoFocus
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
            required
          />

          {error && (
            <p
              role="alert"
              className="rounded-lg border border-danger-border bg-danger-subtle px-3 py-2 text-sm text-danger"
            >
              {error}
            </p>
          )}

          {resendMessage && (
            <p className="rounded-lg border border-accent-border bg-accent-subtle px-3 py-2 text-sm text-accent">
              {resendMessage}
            </p>
          )}

          <Button
            type="submit"
            variant="accent"
            icon={LogIn}
            loading={submitting}
            className="mt-1 w-full"
          >
            Verify and sign in
          </Button>
        </form>

        <p className="mt-6 text-sm text-muted">
          Didn&apos;t get a code?{" "}
          <button
            type="button"
            onClick={handleResend}
            disabled={resending}
            className="font-medium text-accent underline-offset-2 hover:underline disabled:opacity-50"
          >
            Resend
          </button>
        </p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <div className="mb-7 flex items-center gap-3">
        <img src="/logo.png" alt="Mnemos" className="h-10 w-10" />

        <div>
          <p className="text-base font-semibold tracking-tight text-primary">
            Mnemos
          </p>
          <p className="font-mono text-[9px] uppercase tracking-[0.13em] text-muted">
            Your AI Finance Assistant
          </p>
        </div>
      </div>

      <h1 className="text-xl font-semibold tracking-tight text-primary">
        Sign in
      </h1>

      <p className="mt-1.5 text-sm text-muted">
        Pick up where your finance assistant left off.
      </p>

      {location.state?.registered && (
        <p className="mt-5 rounded-lg border border-accent-border bg-accent-subtle px-3 py-2 text-sm text-accent">
          Account created. Sign in to continue.
        </p>
      )}

      <form
        onSubmit={handleSubmit}
        className="mt-7 flex flex-col gap-4"
      >
        <TextField
          id="username"
          label="Username or email"
          autoComplete="username"
          value={form.username}
          onChange={update("username")}
          required
        />

        <TextField
          id="password"
          label="Password"
          type="password"
          autoComplete="current-password"
          value={form.password}
          onChange={update("password")}
          required
        />

        {error && (
          <p
            role="alert"
            className="rounded-lg border border-danger-border bg-danger-subtle px-3 py-2 text-sm text-danger"
          >
            {error}
          </p>
        )}

        <Button
          type="submit"
          variant="accent"
          icon={LogIn}
          loading={submitting}
          className="mt-1 w-full"
        >
          Sign in
        </Button>
      </form>

      <div className="mt-5 flex items-center gap-2 rounded-lg border border-border bg-surface-subtle px-3 py-2.5">
        <ShieldCheck
          size={14}
          className="shrink-0 text-accent"
          strokeWidth={1.8}
        />
        <span className="text-[11px] leading-4 text-muted">
          Your session is protected and restored automatically when valid.
        </span>
      </div>

      <p className="mt-6 text-sm text-muted">
        Don&apos;t have an account?{" "}
        <Link
          to="/register"
          className="font-medium text-accent underline-offset-2 hover:underline"
        >
          Create one
        </Link>
      </p>
    </AuthLayout>
  );
}