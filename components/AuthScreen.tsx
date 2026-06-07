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
    <div className="flex h-[100dvh] items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-black tracking-tight text-white">
            Unspoken<span className="text-amber-400">AI</span>
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            {mode === "signin" ? a.signInTitle : a.signUpTitle}
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl"
        >
          <div className="flex flex-col gap-4">
            {mode === "signup" && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {a.nameLabel}
                </label>
                <input
                  type="text"
                  required
                  autoComplete="name"
                  placeholder={a.namePlaceholder}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                {a.emailLabel}
              </label>
              <input
                type="email"
                required
                autoComplete="email"
                placeholder={a.emailPlaceholder}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
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
                className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              />
            </div>

            {error && (
              <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="mt-1 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition-colors hover:bg-amber-400 disabled:opacity-60"
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
          className="mt-4 w-full text-center text-sm text-slate-500 hover:text-slate-300 transition-colors"
        >
          {mode === "signin" ? a.toggleSignUp : a.toggleSignIn}
        </button>
      </div>
    </div>
  );
}
