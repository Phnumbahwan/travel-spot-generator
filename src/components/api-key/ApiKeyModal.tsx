"use client";

import { useState, useEffect, FormEvent } from "react";

const SESSION_KEY = "latagaw_openai_key";

export function getStoredApiKey(): string {
  if (typeof window === "undefined") return "";
  return sessionStorage.getItem(SESSION_KEY) ?? "";
}

export function clearStoredApiKey() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(SESSION_KEY);
}

interface ApiKeyModalProps {
  open: boolean;
  /** Called with the saved key when the user submits */
  onSave: (key: string) => void;
  /** Called when the modal is dismissed without saving (only if a key already exists) */
  onClose?: () => void;
}

export function ApiKeyModal({ open, onSave, onClose }: ApiKeyModalProps) {
  const [value, setValue] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [error, setError] = useState("");
  const hasExisting = !!getStoredApiKey();

  useEffect(() => {
    if (open) {
      setValue("");
      setError("");
      setShowKey(false);
    }
  }, [open]);

  if (!open) return null;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed.startsWith("sk-")) {
      setError('Key must start with "sk-". Check your key and try again.');
      return;
    }
    sessionStorage.setItem(SESSION_KEY, trimmed);
    onSave(trimmed);
  };

  return (
    /* Backdrop — always closeable */
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: "rgba(44,24,16,0.55)", backdropFilter: "blur(4px)" }}
      onClick={(e) => {
        if (onClose && e.target === e.currentTarget) onClose();
      }}
    >
      {/* Card */}
      <div className="bg-warm-white rounded-3xl shadow-2xl w-full max-w-md p-8 relative border border-border">
        {/* Close button — always visible */}
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-warm-muted hover:text-warm-text text-xl leading-none transition-colors"
            aria-label="Close"
          >
            ×
          </button>
        )}

        {/* Icon + title */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 bg-cream rounded-2xl flex items-center justify-center text-3xl mb-4 border border-border">
            🔑
          </div>
          <h2
            className="text-xl font-bold text-warm-text mb-1"
            style={{ fontFamily: "var(--font-lora)" }}
          >
            {hasExisting ? "Update API Key" : "Enter your OpenAI API Key"}
          </h2>
          <p className="text-warm-muted text-sm leading-relaxed max-w-xs">
            Your key is stored only in this browser session and is never saved
            to any server or database.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <input
              type={showKey ? "text" : "password"}
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                setError("");
              }}
              placeholder={hasExisting ? "Enter new key to replace…" : "sk-proj-…"}
              autoComplete="off"
              spellCheck={false}
              className="w-full pl-4 pr-11 py-3.5 rounded-2xl border-2 border-border bg-cream text-warm-text placeholder:text-warm-muted focus:outline-none focus:border-terracotta transition-colors text-sm font-mono"
            />
            <button
              type="button"
              onClick={() => setShowKey((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-warm-muted hover:text-warm-text transition-colors text-lg"
              aria-label={showKey ? "Hide key" : "Show key"}
            >
              {showKey ? "🙈" : "👁️"}
            </button>
          </div>

          {error && (
            <p className="text-red-600 text-xs bg-red-50 px-3 py-2 rounded-xl border border-red-200">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={!value.trim()}
            className="w-full py-3.5 bg-terracotta text-white rounded-2xl font-medium hover:bg-terracotta-dark disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95"
          >
            Save &amp; Continue
          </button>
        </form>

        {/* Footer link */}
        <p className="text-center text-warm-muted text-xs mt-5">
          Don&apos;t have a key?{" "}
          <a
            href="https://platform.openai.com/api-keys"
            target="_blank"
            rel="noopener noreferrer"
            className="text-terracotta hover:underline"
          >
            Get one at platform.openai.com →
          </a>
        </p>
      </div>
    </div>
  );
}
