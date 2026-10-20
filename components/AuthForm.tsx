"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CircleAlert } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { friendlyAuthError } from "@/lib/errors";
import BrandMark from "./BrandMark";

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
      setError(friendlyAuthError(error));
      setLoading(false);
      return;
    }
    if (!data.session) {
      setError("Your account was created, but email confirmation is turned on. Please contact support.");
      setLoading(false);
      return;
    }

    router.replace("/app");
    router.refresh();
  }

  return (
    <div className="auth-wrap">
      <div className="auth-box enter">
        <BrandMark className="auth-logo" />
        <div className="card auth-card">
          <div className="auth-head">
            <h1 className="h1">{isSignup ? "Create your StoryBank" : "Welcome back"}</h1>
            <p className="muted">
              {isSignup
                ? "Start building your interview stories in under a minute."
                : "Log in to keep practising your stories."}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="field">
              <label className="field-label" htmlFor={`${mode}-email`}>
                Email
              </label>
              <input
                id={`${mode}-email`}
                className="input"
                type="email"
                name="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                data-testid={`${mode}-email`}
              />
            </div>
            <div className="field">
              <label className="field-label" htmlFor={`${mode}-password`}>
                Password
              </label>
              <input
                id={`${mode}-password`}
                className="input"
                type="password"
                name="password"
                autoComplete={isSignup ? "new-password" : "current-password"}
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-describedby={isSignup ? "password-hint" : undefined}
                data-testid={`${mode}-password`}
              />
              {isSignup && (
                <p id="password-hint" className="field-hint">
                  At least 6 characters.
                </p>
              )}
            </div>

            {error && (
              <p className="field-error" role="alert">
                <CircleAlert size={16} strokeWidth={1.75} aria-hidden="true" />
                {error}
              </p>
            )}

            <button
              type="submit"
              className="btn btn-primary btn-lg btn-block"
              disabled={loading}
              data-testid={`${mode}-submit`}
            >
              {loading ? "Please wait…" : isSignup ? "Sign up" : "Log in"}
            </button>
          </form>
        </div>

        <p className="auth-switch">
          {isSignup ? (
            <>
              Already have an account? <Link href="/login">Log in</Link>
            </>
          ) : (
            <>
              New here? <Link href="/signup">Create an account</Link>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
