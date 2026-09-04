import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { LogIn, ShieldCheck } from "lucide-react";
import AuthLayout from "../layouts/AuthLayout";
import TextField from "../components/TextField";
import Button from "../components/Button";
import GoogleSignInButton from "../components/GoogleSignInButton";
import VerifyEmailStep from "../components/VerifyEmailStep";
import { useAuth } from "../context/AuthContext";
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

export default function Login() {
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({
    username: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [verificationToken, setVerificationToken] = useState(null);

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

      if (result.verificationRequired) {
        setVerificationToken(result.verificationToken);
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

  const handleGoogleCredential = async (credential) => {
    setError("");

    try {
      await loginWithGoogle(credential);
      goToRedirect();
    } catch (err) {
      setError(getErrorMessage(err, "Google sign-in failed. Please try again."));
    }
  };

  if (verificationToken) {
    return (
      <AuthLayout>
        <BrandHeader />
        <VerifyEmailStep
          verificationToken={verificationToken}
          onVerified={goToRedirect}
        />
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <BrandHeader />

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

      {import.meta.env.VITE_GOOGLE_CLIENT_ID && (
        <>
          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-faint">or</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <GoogleSignInButton
            onCredential={handleGoogleCredential}
            onError={setError}
          />
        </>
      )}

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
