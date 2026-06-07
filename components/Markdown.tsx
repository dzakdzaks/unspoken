"use client";

import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

const components: Components = {
  p: ({ children }) => <p className="my-2 first:mt-0 last:mb-0">{children}</p>,
  strong: ({ children }) => (
    <strong className="font-semibold text-ink">{children}</strong>
  ),
  em: ({ children }) => <em className="italic">{children}</em>,
  del: ({ children }) => (
    <del className="text-muted decoration-muted/60">{children}</del>
  ),
  ul: ({ children }) => (
    <ul className="my-2 space-y-1 pl-1 first:mt-0 last:mb-0 [&>li:not(.task-list-item)]:relative [&>li:not(.task-list-item)]:pl-5 [&>li:not(.task-list-item)]:before:absolute [&>li:not(.task-list-item)]:before:left-0 [&>li:not(.task-list-item)]:before:top-[0.6em] [&>li:not(.task-list-item)]:before:h-1.5 [&>li:not(.task-list-item)]:before:w-1.5 [&>li:not(.task-list-item)]:before:-translate-y-1/2 [&>li:not(.task-list-item)]:before:rounded-full [&>li:not(.task-list-item)]:before:bg-primary/70">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="my-2 list-decimal space-y-1 pl-5 first:mt-0 last:mb-0 marker:font-semibold marker:text-primary/80">
      {children}
    </ol>
  ),
  li: ({ children, className }) => {
    // Task-list items carry a className from remark-gfm and embed their own
    // checkbox; render them without the bullet glyph.
    if (className?.includes("task-list-item")) {
      return (
        <li className="task-list-item flex items-start gap-2 leading-relaxed">
          {children}
        </li>
      );
    }
    return <li className="leading-relaxed">{children}</li>;
  },
  input: ({ checked, type }) =>
    type === "checkbox" ? (
      <span
        className={`mt-[0.2em] flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px] ${
          checked
            ? "border-primary bg-primary text-on-primary"
            : "border-hairline-strong bg-surface-card text-transparent"
        }`}
        aria-hidden
      >
        {checked ? "✓" : ""}
      </span>
    ) : null,
  h1: ({ children }) => (
    <h1 className="mb-2 mt-4 flex items-center gap-2 text-base font-bold text-ink first:mt-0 before:h-4 before:w-1 before:rounded-full before:bg-primary">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="mb-2 mt-4 border-b border-hairline pb-1 text-sm font-bold uppercase tracking-wide text-body-strong first:mt-0">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="mb-1 mt-3 text-sm font-semibold text-body-strong first:mt-0">
      {children}
    </h3>
  ),
  a: ({ children, href }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="font-medium text-primary underline decoration-primary/40 underline-offset-2 transition-colors hover:text-primary-active hover:decoration-primary"
    >
      {children}
    </a>
  ),
  blockquote: ({ children }) => (
    <blockquote className="my-3 rounded-r-md border-l-2 border-primary/60 bg-surface-card/50 py-1 pl-3 pr-2 italic text-muted">
      {children}
    </blockquote>
  ),
  code: ({ children }) => (
    <code className="rounded border border-hairline/60 bg-surface-card px-1.5 py-0.5 font-mono text-[0.85em] text-primary">
      {children}
    </code>
  ),
  pre: ({ children }) => (
    <pre className="my-3 overflow-x-auto rounded-lg border border-hairline bg-surface-card p-3 font-mono text-xs leading-relaxed text-body shadow-inner [&>code]:border-0 [&>code]:bg-transparent [&>code]:p-0 [&>code]:text-body">
      {children}
    </pre>
  ),
  table: ({ children }) => (
    <div className="my-3 overflow-x-auto rounded-lg border border-hairline">
      <table className="w-full border-collapse text-left text-xs">
        {children}
      </table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-surface-card text-body-strong">{children}</thead>
  ),
  th: ({ children }) => (
    <th className="border-b border-hairline px-3 py-2 font-semibold">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border-b border-hairline/50 px-3 py-2 align-top">
      {children}
    </td>
  ),
  tr: ({ children }) => (
    <tr className="transition-colors last:[&>td]:border-0 hover:bg-surface-card/40">
      {children}
    </tr>
  ),
  hr: () => (
    <hr className="my-4 h-px border-0 bg-gradient-to-r from-transparent via-hairline-strong to-transparent" />
  ),
};

export default function Markdown({ content }: { content: string }) {
  return (
    <div className="text-sm leading-relaxed text-body">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
