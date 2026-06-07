"use client";

import { useState, useEffect, useRef } from "react";
import { useI18n } from "@/lib/i18n/context";
import { useAuth } from "@/lib/auth/context";
import LanguageSwitcher from "./LanguageSwitcher";

export type LLMProvider = "openai" | "anthropic" | "gemini" | "groq";

export interface LLMSettings {
  provider: LLMProvider | "";
  model: string;
  apiKey: string;
}

export const DEFAULT_SETTINGS: LLMSettings = {
  provider: "",
  model: "",
  apiKey: "",
};

const STORAGE_KEY = "unspoken_llm_settings";

const PROVIDER_MODELS: Record<LLMProvider, { id: string; label: string }[]> = {
  openai: [
    { id: "gpt-4.1", label: "GPT-4.1" },
    { id: "gpt-4.1-mini", label: "GPT-4.1 Mini" },
    { id: "gpt-4.1-nano", label: "GPT-4.1 Nano" },
    { id: "gpt-4o", label: "GPT-4o" },
    { id: "gpt-4o-mini", label: "GPT-4o Mini" },
    { id: "o3", label: "o3" },
    { id: "o4-mini", label: "o4-mini" },
  ],
  anthropic: [
    { id: "claude-opus-4-5", label: "Claude Opus 4.5" },
    { id: "claude-sonnet-4-5", label: "Claude Sonnet 4.5" },
    { id: "claude-haiku-4-5", label: "Claude Haiku 4.5" },
    { id: "claude-opus-4-7", label: "Claude Opus 4.7" },
    { id: "claude-sonnet-4-6", label: "Claude Sonnet 4.6" },
  ],
  gemini: [
    { id: "gemini-3.1-pro", label: "Gemini 3.1 Pro" },
    { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
    { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
    { id: "gemini-2.0-flash", label: "Gemini 2.0 Flash" },
  ],
  groq: [
    { id: "openai/gpt-oss-20b", label: "GPT-OSS 20B" },
    { id: "openai/gpt-oss-120b", label: "GPT-OSS 120B" },
    { id: "llama-3.3-70b-versatile", label: "Llama 3.3 70B Versatile" },
    { id: "llama-3.1-8b-instant", label: "Llama 3.1 8B Instant" },
  ],
};

export function loadLLMSettings(): LLMSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return {
      ...DEFAULT_SETTINGS,
      ...(JSON.parse(raw) as Partial<LLMSettings>),
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function saveLLMSettings(settings: LLMSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // ignore storage errors
  }
}

interface SettingsPanelProps {
  onSettingsChange: (settings: LLMSettings) => void;
}

export default function SettingsPanel({
  onSettingsChange,
}: SettingsPanelProps) {
  const { t } = useI18n();
  const { user, signOut } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [settings, setSettings] = useState<LLMSettings>(DEFAULT_SETTINGS);
  const [showKey, setShowKey] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loaded = loadLLMSettings();
    setSettings(loaded);
    onSettingsChange(loaded);
  }, [onSettingsChange]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  function handleProviderChange(provider: LLMProvider | "") {
    const models = provider ? PROVIDER_MODELS[provider] : [];
    const defaultModel = models[0]?.id ?? "";
    const next: LLMSettings = {
      ...settings,
      provider,
      model: defaultModel,
      apiKey: "",
    };
    setSettings(next);
    saveLLMSettings(next);
    onSettingsChange(next);
  }

  function handleModelChange(model: string) {
    const next: LLMSettings = { ...settings, model };
    setSettings(next);
    saveLLMSettings(next);
    onSettingsChange(next);
  }

  function handleApiKeyChange(apiKey: string) {
    const next: LLMSettings = { ...settings, apiKey };
    setSettings(next);
    saveLLMSettings(next);
    onSettingsChange(next);
  }

  const isActive = Boolean(settings.provider);
  const models = settings.provider ? PROVIDER_MODELS[settings.provider] : [];

  const selectClass =
    "w-full rounded-md border border-hairline-strong bg-surface-elevated/60 px-3 py-2 text-sm text-body outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 transition-colors";

  return (
    <div ref={panelRef} className="relative">
      <button
        onClick={() => setIsOpen((v) => !v)}
        aria-label={t.settings.title}
        className={`flex items-center justify-center rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors ${
          isActive
            ? "border-primary/40 bg-primary/10 text-primary hover:bg-primary/20"
            : "border-hairline-strong bg-surface-elevated/40 text-muted hover:border-muted-soft hover:text-body"
        }`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="h-3.5 w-3.5"
        >
          <path
            fillRule="evenodd"
            d="M7.84 1.804A1 1 0 0 1 8.82 1h2.36a1 1 0 0 1 .98.804l.331 1.652a6.993 6.993 0 0 1 1.929 1.115l1.598-.54a1 1 0 0 1 1.186.447l1.18 2.044a1 1 0 0 1-.205 1.251l-1.267 1.113a7.047 7.047 0 0 1 0 2.228l1.267 1.113a1 1 0 0 1 .206 1.25l-1.18 2.045a1 1 0 0 1-1.187.447l-1.598-.54a6.993 6.993 0 0 1-1.929 1.115l-.33 1.652a1 1 0 0 1-.98.804H8.82a1 1 0 0 1-.98-.804l-.331-1.652a6.993 6.993 0 0 1-1.929-1.115l-1.598.54a1 1 0 0 1-1.186-.447l-1.18-2.044a1 1 0 0 1 .205-1.251l1.267-1.114a7.05 7.05 0 0 1 0-2.227L1.821 7.773a1 1 0 0 1-.206-1.25l1.18-2.045a1 1 0 0 1 1.187-.447l1.598.54A6.992 6.992 0 0 1 7.51 3.456l.33-1.652ZM10 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"
            clipRule="evenodd"
          />
        </svg>
        {isActive && (
          <span className="ml-1.5 hidden sm:inline">
            {t.settings.providerLabels[settings.provider as LLMProvider]}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-2 w-72 rounded-lg border border-hairline bg-surface-card p-4 shadow-2xl shadow-black/60">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted">
            {t.settings.menuTitle}
          </p>

          {/* Account */}
          {user && (
            <div className="mb-3">
              <p className="mb-1.5 text-xs font-medium text-muted">
                {t.settings.account}
              </p>
              <div className="flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-body-strong">
                    {user.name}
                  </p>
                  <p className="truncate text-xs text-muted-soft">
                    {user.email}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={signOut}
                  className="shrink-0 rounded-md border border-hairline-strong px-2.5 py-1.5 text-xs text-muted transition-colors hover:text-body-strong"
                >
                  {t.auth.signOut}
                </button>
              </div>
            </div>
          )}

          <div className="my-3 border-t border-hairline" />

          {/* Language */}
          <div className="mb-3 flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-muted">
              {t.settings.language}
            </span>
            <LanguageSwitcher />
          </div>

          <div className="my-3 border-t border-hairline" />

          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted">
            {t.settings.title}
          </p>

          {/* Provider */}
          <div className="mb-3">
            <label className="mb-1.5 block text-xs font-medium text-muted">
              {t.settings.provider}
            </label>
            <select
              value={settings.provider}
              onChange={(e) =>
                handleProviderChange(e.target.value as LLMProvider | "")
              }
              className={selectClass}
            >
              <option value="">{t.settings.useServerDefault}</option>
              <option value="openai">{t.settings.providerLabels.openai}</option>
              <option value="anthropic">
                {t.settings.providerLabels.anthropic}
              </option>
              <option value="gemini">{t.settings.providerLabels.gemini}</option>
              <option value="groq">{t.settings.providerLabels.groq}</option>
            </select>
          </div>

          {/* Model — only shown when a provider is selected */}
          {settings.provider && (
            <div className="mb-3">
              <label className="mb-1.5 block text-xs font-medium text-muted">
                {t.settings.model}
              </label>
              <select
                value={settings.model}
                onChange={(e) => handleModelChange(e.target.value)}
                className={selectClass}
              >
                {models.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* API Key — only shown when a provider is selected */}
          {settings.provider && (
            <div className="mb-1">
              <label className="mb-1.5 block text-xs font-medium text-muted">
                {t.settings.apiKey}
              </label>
              <div className="relative">
                <input
                  type={showKey ? "text" : "password"}
                  value={settings.apiKey}
                  onChange={(e) => handleApiKeyChange(e.target.value)}
                  placeholder={t.settings.apiKeyPlaceholder}
                  className="w-full rounded-md border border-hairline-strong bg-surface-elevated/60 py-2 pl-3 pr-9 text-sm text-body placeholder-muted-soft outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 transition-colors"
                  autoComplete="off"
                  spellCheck={false}
                />
                <button
                  type="button"
                  onClick={() => setShowKey((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-body transition-colors"
                  tabIndex={-1}
                >
                  {showKey ? (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className="h-4 w-4"
                    >
                      <path
                        fillRule="evenodd"
                        d="M3.28 2.22a.75.75 0 0 0-1.06 1.06l14.5 14.5a.75.75 0 1 0 1.06-1.06l-1.745-1.745a10.029 10.029 0 0 0 3.3-4.38 1.651 1.651 0 0 0 0-1.185A10.004 10.004 0 0 0 9.999 3a9.956 9.956 0 0 0-4.744 1.194L3.28 2.22ZM7.752 6.69l1.092 1.092a2.5 2.5 0 0 1 3.374 3.373l1.091 1.092a4 4 0 0 0-5.557-5.557Z"
                        clipRule="evenodd"
                      />
                      <path d="M10.748 13.93l2.523 2.523a9.987 9.987 0 0 1-3.27.547c-4.258 0-7.894-2.66-9.337-6.41a1.651 1.651 0 0 1 0-1.185A10.007 10.007 0 0 1 2.839 6.02L6.07 9.252a4 4 0 0 0 4.678 4.678Z" />
                    </svg>
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className="h-4 w-4"
                    >
                      <path d="M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
                      <path
                        fillRule="evenodd"
                        d="M.664 10.59a1.651 1.651 0 0 1 0-1.186A10.004 10.004 0 0 1 10 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0 1 10 17c-4.257 0-7.893-2.66-9.336-6.41Z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </button>
              </div>
              <p className="mt-1.5 text-xs text-muted">
                {t.settings.apiKeyHint}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
