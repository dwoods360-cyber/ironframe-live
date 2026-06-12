"use client";

import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { normalizeDocMarkdownHref } from "@/lib/docsLinkNormalization";

function createMarkdownComponents(currentSlug: string[]): Components {
  return {
  h1: ({ children, ...props }) => (
    <h1
      className="mb-6 border-b border-slate-800 pb-3 font-mono text-2xl font-bold uppercase tracking-tight text-white"
      {...props}
    >
      {children}
    </h1>
  ),
  h2: ({ children, ...props }) => (
    <h2
      className="mb-4 mt-8 border-l-2 border-teal-500 pl-3 font-mono text-lg font-bold uppercase tracking-wide text-teal-400"
      {...props}
    >
      {children}
    </h2>
  ),
  h3: ({ children, ...props }) => (
    <h3 className="mb-2 mt-6 font-mono text-sm font-bold text-slate-300" {...props}>
      {children}
    </h3>
  ),
  p: ({ children, ...props }) => (
    <p className="mb-4 font-sans text-sm leading-relaxed text-slate-300" {...props}>
      {children}
    </p>
  ),
  strong: ({ children, ...props }) => (
    <strong className="font-sans font-bold text-teal-300" {...props}>
      {children}
    </strong>
  ),
  ul: ({ children, ...props }) => (
    <ul className="mb-4 list-disc space-y-2 pl-6 text-sm text-slate-300" {...props}>
      {children}
    </ul>
  ),
  ol: ({ children, ...props }) => (
    <ol className="mb-4 list-inside list-decimal space-y-2 pl-2 text-sm text-slate-300" {...props}>
      {children}
    </ol>
  ),
  li: ({ children, ...props }) => (
    <li className="font-sans" {...props}>
      {children}
    </li>
  ),
  code: ({ children, className, ...props }) => {
    const isBlock = className?.includes("language-");
    if (isBlock) {
      return (
        <code className={`block font-mono text-xs text-teal-400 ${className ?? ""}`} {...props}>
          {children}
        </code>
      );
    }
    return (
      <code
        className="rounded border border-slate-800 bg-slate-900 px-1.5 py-0.5 font-mono text-xs text-teal-400"
        {...props}
      >
        {children}
      </code>
    );
  },
  pre: ({ children, ...props }) => (
    <pre
      className="my-4 overflow-x-auto rounded-lg border border-slate-800 bg-slate-900 p-4 font-mono text-xs leading-relaxed text-slate-300"
      {...props}
    >
      {children}
    </pre>
  ),
  blockquote: ({ children, ...props }) => (
    <blockquote
      className="my-4 rounded border-l-4 border-slate-700 bg-slate-900/50 p-4 text-xs italic leading-relaxed text-slate-400"
      {...props}
    >
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-8 border-slate-900" />,
  a: ({ children, href, ...props }) => {
    const normalizedHref = normalizeDocMarkdownHref(href, currentSlug);
    return (
      <a
        href={normalizedHref}
        className="text-teal-400 underline decoration-teal-500/40 underline-offset-2 hover:text-teal-300"
        {...props}
      >
        {children}
      </a>
    );
  },
  table: ({ children, ...props }) => (
    <div className="my-4 overflow-x-auto">
      <table className="w-full border-collapse text-sm text-slate-300" {...props}>
        {children}
      </table>
    </div>
  ),
  th: ({ children, ...props }) => (
    <th
      className="border border-slate-800 bg-slate-900/80 px-3 py-2 text-left font-mono text-xs uppercase tracking-wide text-slate-400"
      {...props}
    >
      {children}
    </th>
  ),
  td: ({ children, ...props }) => (
    <td className="border border-slate-800 px-3 py-2 font-sans text-sm" {...props}>
      {children}
    </td>
  ),
  };
}

export default function DocsMarkdown({
  content,
  currentSlug,
}: {
  content: string;
  currentSlug: string[];
}) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={createMarkdownComponents(currentSlug)}
    >
      {content}
    </ReactMarkdown>
  );
}
