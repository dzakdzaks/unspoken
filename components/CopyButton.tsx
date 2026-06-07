"use client";

import { useEffect, useRef, useState } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useI18n } from "@/lib/i18n/context";

/** Render markdown source to a clean semantic HTML string for rich-text paste. */
function markdownToHtml(markdown: string): string {
  return renderToStaticMarkup(
    <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>,
  );
}

async function copyMarkdown(markdown: string) {
  // Write both rich HTML and the markdown source so formatting survives paste
  // into rich editors (Docs, Notion, email) and markdown editors alike.
  if (
    typeof ClipboardItem !== "undefined" &&
    navigator.clipboard?.write
  ) {
    try {
      const html = markdownToHtml(markdown);
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/html": new Blob([html], { type: "text/html" }),
          "text/plain": new Blob([markdown], { type: "text/plain" }),
        }),
      ]);
      return;
    } catch {
      // Fall through to plain-text strategies below.
    }
  }

  try {
    await navigator.clipboard.writeText(markdown);
    return;
  } catch {
    // Last-resort fallback for non-secure contexts without the clipboard API.
    const textarea = document.createElement("textarea");
    textarea.value = markdown;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
  }
}

export default function CopyButton({ value }: { value: string }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const label = t.actions.copy;
  const copiedLabel = t.actions.copied;

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  async function handleCopy() {
    await copyMarkdown(value);
    setCopied(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setCopied(false), 1600);
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={copied ? copiedLabel : label}
      className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-muted transition-colors hover:bg-surface-card hover:text-body-strong focus:outline-none focus-visible:ring-1 focus-visible:ring-primary/60"
    >
      {copied ? (
        <CheckIcon className="h-3.5 w-3.5 text-primary" />
      ) : (
        <CopyIcon className="h-3.5 w-3.5" />
      )}
      <span>{copied ? copiedLabel : label}</span>
    </button>
  );
}

function CopyIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}
