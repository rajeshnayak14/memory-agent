import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { KeyRound, MailCheck } from "lucide-react";
import AuthLayout from "../layouts/AuthLayout";
import TextField from "../components/TextField";
import Button from "../components/Button";
import { useAuth } from "../context/AuthContext";
import { forgotPassword } from "../api/auth";
import { isPasswordValid, PASSWORD_REQUIREMENT } from "../utils/password";
import { getErrorMessage } from "../utils/errorMessage";

function BrandHeader() {
  return (
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
  );
}

function RequestCodeStep({ onSent }) {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setError("");

    try {
      await forgotPassword(email);
      onSent(email);
    } catch (err) {
      setError(getErrorMessage(err, "Something went wrong. Please try again."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <h1 className="text-xl font-semibold tracking-tight text-primary">
        Forgot password
      </h1>

      <p className="mt-1.5 text-sm text-muted">
        Enter the email on your account and we'll send you a reset code.
      </p>

      <form onSubmit={handleSubmit} className="mt-7 flex flex-col gap-4">
        <TextField
          id="forgot-email"
          label="Email"
          type="email"
          autoComplete="email"
          autoFocus
          value={email}
          onChange={(event) => setEmail(event.target.value)}
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
          icon={MailCheck}
          loading={submitting}
          className="mt-1 w-full"
        >
          Send reset code
        </Button>
      </form>

      <p className="mt-6 text-sm text-muted">
        Remembered your password?{" "}
        <Link
          to="/login"
          className="font-medium text-accent underline-offset-2 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </>
  );
}

function ResetPasswordStep({ email }) {
  const { completePasswordReset } = useAuth();
  const navigate = useNavigate();

  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;

    if (!isPasswordValid(newPassword)) {
      setError(PASSWORD_REQUIREMENT);
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      await completePasswordReset({ email, code, newPassword });
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(getErrorMessage(err, "Invalid or expired code. Please try again."));
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    setError("");
    try {
      await forgotPassword(email);
    } catch (err) {
      setError(getErrorMessage(err, "Could not resend the code."));
    }
  };

  return (
    <>
      <h1 className="flex items-center gap-2.5 text-xl font-semibold tracking-tight text-primary">
        <KeyRound size={19} strokeWidth={1.8} />
        Reset your password
      </h1>

      <p className="mt-1.5 text-sm text-muted">
        Enter the 6-digit code sent to <span className="text-primary">{email}</span>,
        along with your new password.
      </p>

      <form onSubmit={handleSubmit} className="mt-7 flex flex-col gap-4">
        <TextField
          id="reset-code"
          label="Reset code"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          autoFocus
          value={code}
          onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
          required
        />

        <TextField
          id="new-password"
          label="New password"
          type="password"
          autoComplete="new-password"
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
          hint={PASSWORD_REQUIREMENT}
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
          icon={KeyRound}
          loading={submitting}
          className="mt-1 w-full"
        >
          Reset password
        </Button>
      </form>

      <p className="mt-6 text-sm text-muted">
        Didn&apos;t get a code?{" "}
        <button
          type="button"
          onClick={handleResend}
          className="font-medium text-accent underline-offset-2 hover:underline"
        >
          Resend
        </button>
      </p>
    </>
  );
}

export default function ForgotPassword() {
  const [email, setEmail] = useState(null);

  return (
    <AuthLayout>
      <BrandHeader />

      {email ? (
        <ResetPasswordStep email={email} />
      ) : (
        <RequestCodeStep onSent={setEmail} />
      )}
    </AuthLayout>
  );
}
