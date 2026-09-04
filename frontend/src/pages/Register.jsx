import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { UserPlus } from "lucide-react";
import AuthLayout from "../layouts/AuthLayout";
import TextField from "../components/TextField";
import Button from "../components/Button";
import GoogleSignInButton from "../components/GoogleSignInButton";
import VerifyEmailStep from "../components/VerifyEmailStep";
import { registerUser } from "../api/auth";
import { useAuth } from "../context/AuthContext";
import { getErrorMessage } from "../utils/errorMessage";
import { isPasswordValid, PASSWORD_REQUIREMENT } from "../utils/password";

export default function Register() {
  const navigate = useNavigate();
  const { loginWithGoogle } = useAuth();

  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [verificationToken, setVerificationToken] = useState(null);

  const update = (field) => (event) =>
    setForm((prev) => ({ ...prev, [field]: event.target.value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;

    if (form.username.trim().length < 3) {
      setError("Username must be at least 3 characters.");
      return;
    }
    if (!isPasswordValid(form.password)) {
      setError(PASSWORD_REQUIREMENT);
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const result = await registerUser(form);
      setVerificationToken(result.verification_token);
    } catch (err) {
      setError(getErrorMessage(err, "Unable to create your account. Please try again."));
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleCredential = async (credential) => {
    setError("");

    try {
      await loginWithGoogle(credential);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(getErrorMessage(err, "Google sign-in failed. Please try again."));
    }
  };

  if (verificationToken) {
    return (
      <AuthLayout>
        <VerifyEmailStep
          verificationToken={verificationToken}
          onVerified={() => navigate("/dashboard", { replace: true })}
        />
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <h1 className="text-xl font-semibold tracking-tight text-ink-900">Create an account</h1>
      <p className="mt-1.5 text-sm text-ink-500">Start building a memory with your agent.</p>

      <form onSubmit={handleSubmit} className="mt-7 flex flex-col gap-4">
        <TextField
          id="username"
          label="Username"
          autoComplete="username"
          minLength={3}
          maxLength={100}
          value={form.username}
          onChange={update("username")}
          required
        />
        <TextField
          id="email"
          label="Email"
          type="email"
          autoComplete="email"
          value={form.email}
          onChange={update("email")}
          required
        />
        <TextField
          id="password"
          label="Password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          maxLength={100}
          hint={PASSWORD_REQUIREMENT}
          value={form.password}
          onChange={update("password")}
          required
        />

        {error && (
          <p role="alert" className="rounded border border-danger-500/30 bg-danger-100 px-3 py-2 text-sm text-danger-500">
            {error}
          </p>
        )}

        <Button type="submit" variant="accent" icon={UserPlus} loading={submitting} className="mt-1 w-full">
          Create account
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

      <p className="mt-6 text-sm text-ink-500">
        Already have an account?{" "}
        <Link to="/login" className="font-medium text-ink-900 underline-offset-2 hover:underline">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
