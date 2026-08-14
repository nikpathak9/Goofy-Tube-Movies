import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Lock, Mail, User, AlertCircle } from "lucide-react";
import AuthLayout, { AuthField } from "./AuthLayout";
import { useAuth } from "../lib/useAuth";

/** Cheap, honest strength signal — no library needed. */
function scorePassword(pw) {
  if (!pw) return 0;
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return Math.min(score, 4);
}

const STRENGTH = [
  { label: "Too short", color: "bg-faint" },
  { label: "Weak", color: "bg-accent" },
  { label: "Fair", color: "bg-gold" },
  { label: "Good", color: "bg-emerald-500" },
  { label: "Strong", color: "bg-emerald-400" },
];

const SignUp = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { setUser } = useAuth();
  const returnTo = typeof location.state?.from === "string" && location.state.from.startsWith("/")
    ? location.state.from
    : "/";

  const strength = scorePassword(password);

  // Inline validation, so problems surface before submit rather than after.
  const validate = () => {
    const errors = {};
    if (name.trim().length < 2) errors.name = "Please enter your name.";
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      errors.email = "That doesn't look like an email address.";
    }
    if (password.length < 8) {
      errors.password = "Use at least 8 characters.";
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!validate()) return;

    setLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 600));

      const users = JSON.parse(localStorage.getItem("users") || "[]");
      if (users.find((u) => u.email === email.trim())) {
        setError("An account with that email already exists.");
        return;
      }

      const newUser = { name: name.trim(), email: email.trim(), password };
      users.push(newUser);
      localStorage.setItem("users", JSON.stringify(users));
      setUser(newUser);
      navigate(returnTo, { replace: true });
    } catch {
      setError("Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Create your account"
      subtitle="It takes about ten seconds."
      footer={
        <>
          Already have an account?{" "}
          <Link
            to="/signin"
            state={{ from: returnTo }}
            className="font-medium text-accent transition hover:text-accent-hover"
          >
            Sign in
          </Link>
        </>
      }
    >
      {error && (
        <div
          role="alert"
          className="mb-4 flex items-start gap-2 rounded-lg border border-accent/40
                     bg-accent-soft px-3.5 py-2.5 text-caption text-accent-hover"
        >
          <AlertCircle size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3" noValidate>
        <AuthField
          icon={User}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name"
          autoComplete="name"
          error={fieldErrors.name}
        />
        <AuthField
          icon={Mail}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          autoComplete="email"
          error={fieldErrors.email}
        />
        <div>
          <AuthField
            icon={Lock}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            autoComplete="new-password"
            error={fieldErrors.password}
          />
          {password && (
            <div className="mt-2 flex items-center gap-2">
              <div className="flex flex-1 gap-1">
                {[0, 1, 2, 3].map((i) => (
                  <span
                    key={i}
                    className={`h-1 flex-1 rounded-full transition-colors duration-200 ${
                      i < strength ? STRENGTH[strength].color : "bg-surface-3"
                    }`}
                  />
                ))}
              </div>
              <span className="w-14 text-right text-[11px] text-faint">
                {STRENGTH[strength].label}
              </span>
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="mt-2 w-full rounded-lg bg-accent py-2.5 text-sm font-semibold
                     text-white transition duration-200 hover:bg-accent-hover
                     disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Creating account..." : "Create account"}
        </button>
      </form>

      <p className="mt-4 text-[11px] leading-relaxed text-faint">
        Demo accounts are stored locally in this browser only. Don&rsquo;t use a
        real password.
      </p>
    </AuthLayout>
  );
};

export default SignUp;
