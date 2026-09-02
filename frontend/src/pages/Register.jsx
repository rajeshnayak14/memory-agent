import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { UserPlus } from "lucide-react";
import AuthLayout from "../layouts/AuthLayout";
import TextField from "../components/TextField";
import Button from "../components/Button";
import { registerUser } from "../api/auth";
import { getErrorMessage } from "../utils/errorMessage";
import { isPasswordValid, PASSWORD_REQUIREMENT } from "../utils/password";

export default function Register() {
  const navigate = useNavigate();

  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

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
      await registerUser(form);
      navigate("/login", { state: { registered: true } });
    } catch (err) {
      setError(getErrorMessage(err, "Unable to create your account. Please try again."));
    } finally {
      setSubmitting(false);
    }
  };

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

      <p className="mt-6 text-sm text-ink-500">
        Already have an account?{" "}
        <Link to="/login" className="font-medium text-ink-900 underline-offset-2 hover:underline">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
