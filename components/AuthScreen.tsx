"use client";

import { useState, type FormEvent } from "react";
import { useAuth } from "@/lib/auth/context";
import { useI18n } from "@/lib/i18n/context";

export default function AuthScreen() {
  const { signIn, signUp } = useAuth();
  const { t } = useI18n();
  const a = t.auth;

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (mode === "signin") {
        await signIn(email, password);
      } else {
        await signUp(name, email, password);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : a.errorGeneric;
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  function toggleMode() {
    setMode((m) => (m === "signin" ? "signup" : "signin"));
    setError(null);
  }

  return (
    <div className="flex h-[100dvh] items-center justify-center bg-canvas px-4">
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-ink">
            Unspoken<span className="text-primary">AI</span>
          </h1>
          <p className="mt-2 text-sm text-muted">
            {mode === "signin" ? a.signInTitle : a.signUpTitle}
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-lg border border-hairline bg-surface-card p-6"
        >
          <div className="flex flex-col gap-4">
            {mode === "signup" && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-muted">
                  {a.nameLabel}
                </label>
                <input
                  type="text"
                  required
                  autoComplete="name"
                  placeholder={a.namePlaceholder}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="rounded-md border border-hairline-strong bg-surface-elevated px-3 py-2 text-sm text-body-strong placeholder-muted-soft outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted">
                {a.emailLabel}
              </label>
              <input
                type="email"
                required
                autoComplete="email"
                placeholder={a.emailPlaceholder}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="rounded-md border border-hairline-strong bg-surface-elevated px-3 py-2 text-sm text-body-strong placeholder-muted-soft outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted">
                {a.passwordLabel}
              </label>
              <input
                type="password"
                required
                autoComplete={
                  mode === "signin" ? "current-password" : "new-password"
                }
                placeholder={a.passwordPlaceholder}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="rounded-md border border-hairline-strong bg-surface-elevated px-3 py-2 text-sm text-body-strong placeholder-muted-soft outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>

            {error && (
              <p className="rounded-md border border-accent-rose/30 bg-accent-rose/10 px-3 py-2 text-sm text-accent-rose">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="mt-1 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary transition-colors hover:bg-primary-active disabled:opacity-60"
            >
              {submitting
                ? a.submitting
                : mode === "signin"
                  ? a.submitSignIn
                  : a.submitSignUp}
            </button>
          </div>
        </form>

        <button
          onClick={toggleMode}
          className="mt-4 w-full text-center text-sm text-muted hover:text-body transition-colors"
        >
          {mode === "signin" ? a.toggleSignUp : a.toggleSignIn}
        </button>
      </div>
    </div>
  );
}
