import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Lock, Mail, AlertCircle } from "lucide-react";
import AuthLayout, { AuthField } from "./AuthLayout";
import { useAuth } from "../lib/useAuth";
import { authStorageError, findAccount, readAccounts } from "../lib/authStorage";

const SignIn = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { setUser } = useAuth();
  const returnTo = typeof location.state?.from === "string" && location.state.from.startsWith("/")
    ? location.state.from
    : "/";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await new Promise((resolve) => setTimeout(resolve, 600));

      const users = readAccounts();
      if (!users.length) {
        setError("No account was found in this browser. Create an account first.");
        return;
      }

      const matchedUser = findAccount(users, email, password);

      if (!matchedUser) {
        setError("Invalid email or password.");
        return;
      }

      setUser(matchedUser);
      navigate(returnTo, { replace: true });
    } catch (storageError) {
      setError(authStorageError(storageError, "sign-in"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to pick up where you left off."
      footer={
        <>
          Don&rsquo;t have an account?{" "}
          <Link
            to="/signup"
            state={{ from: returnTo }}
            className="font-medium text-accent transition hover:text-accent-hover"
          >
            Sign up
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

      <form onSubmit={handleSubmit} className="space-y-3">
        <AuthField
          icon={Mail}
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (error) setError("");
          }}
          placeholder="Email"
          autoComplete="email"
          required
        />
        <AuthField
          icon={Lock}
          type="password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            if (error) setError("");
          }}
          placeholder="Password"
          autoComplete="current-password"
          required
        />

        <button
          type="submit"
          disabled={loading}
          className="mt-2 w-full rounded-lg bg-accent py-2.5 text-sm font-semibold
                     text-white transition duration-200 hover:bg-accent-hover
                     disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </form>

      {/*
        This is prototype auth: credentials live in localStorage in plaintext.
        Saying so plainly is better than implying real account security.
      */}
      <p className="mt-4 text-[11px] leading-relaxed text-faint">
        Demo accounts are stored locally in this browser only. Don&rsquo;t use a
        real password.
      </p>
    </AuthLayout>
  );
};

export default SignIn;
