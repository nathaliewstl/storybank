"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Mode = "signup" | "login";

export default function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isSignup = mode === "signup";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();

    const { data, error } = isSignup
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    if (!data.session) {
      setError(
        "Your account was created, but email confirmation is turned on in Supabase. Disable it to log in straight away."
      );
      setLoading(false);
      return;
    }

    router.replace("/app");
    router.refresh();
  }

  return (
    <div className="container auth-wrap">
      <div className="card auth-card">
        <h1>{isSignup ? "Create your StoryBank" : "Welcome back"}</h1>
        <p className="muted">
          {isSignup
            ? "Start building your interview stories in under a minute."
            : "Log in to practice your stories."}
        </p>

        <form onSubmit={handleSubmit} className="stack">
          <label className="field">
            <span>Email</span>
            <input
              type="email"
              name="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              data-testid={`${mode}-email`}
            />
          </label>
          <label className="field">
            <span>Password</span>
            <input
              type="password"
              name="password"
              autoComplete={isSignup ? "new-password" : "current-password"}
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              data-testid={`${mode}-password`}
            />
            {isSignup && <small className="muted">At least 6 characters.</small>}
          </label>

          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="btn btn-primary btn-block"
            disabled={loading}
            data-testid={`${mode}-submit`}
          >
            {loading ? "Please wait…" : isSignup ? "Sign up" : "Log in"}
          </button>
        </form>

        <p className="auth-switch">
          {isSignup ? (
            <>
              Already have an account? <Link href="/login">Log in</Link>
            </>
          ) : (
            <>
              New here? <Link href="/signup">Sign up</Link>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
