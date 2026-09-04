import { useState } from "react";
import { MailCheck, LogIn } from "lucide-react";
import TextField from "./TextField";
import Button from "./Button";
import { useAuth } from "../context/AuthContext";
import { resendVerification } from "../api/auth";
import { getErrorMessage } from "../utils/errorMessage";

export default function VerifyEmailStep({ verificationToken, onVerified }) {
  const { completeVerification } = useAuth();

  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");
  const [resendMessage, setResendMessage] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setError("");

    try {
      const profile = await completeVerification(verificationToken, code);
      onVerified(profile);
    } catch (err) {
      setError(getErrorMessage(err, "Invalid or expired code. Please try again."));
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    setResendMessage("");
    setError("");

    try {
      await resendVerification(verificationToken);
      setResendMessage("A new code has been sent.");
    } catch (err) {
      setError(getErrorMessage(err, "Could not resend the code."));
    } finally {
      setResending(false);
    }
  };

  return (
    <>
      <h1 className="flex items-center gap-2.5 text-xl font-semibold tracking-tight text-primary">
        <MailCheck size={19} strokeWidth={1.8} />
        Verify your email
      </h1>

      <p className="mt-1.5 text-sm text-muted">
        Enter the 6-digit code we just sent to finish setting up your account.
        You'll only need to do this once.
      </p>

      <form onSubmit={handleSubmit} className="mt-7 flex flex-col gap-4">
        <TextField
          id="verify-code"
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
          Verify and continue
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
    </>
  );
}
