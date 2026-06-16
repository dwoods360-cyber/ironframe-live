"use client";

import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import {
  DISALLOWED_MARKDOWN_ELEMENTS,
  sanitizeMarkdownUrl,
  stripDangerousMarkdown,
} from "@/app/lib/governanceFrame/sanitizeMarkdown";

const SECTION_HEADING =
  /^(I{1,4})\.\s|Exposure Vector|Calculated Quantitative Impact|Machine-Rule Technical Translation|Verification Protocol/i;

function headingText(children: React.ReactNode): string {
  if (typeof children === "string") return children;
  if (Array.isArray(children)) return children.map(String).join("");
  return String(children ?? "");
}

function isSectionZone(text: string): boolean {
  return SECTION_HEADING.test(text.replace(/\*\*/g, "").trim());
}

const briefingComponents: Components = {
  h1: ({ children, ...props }) => (
    <h1
      className="mb-8 border-b border-slate-800 pb-4 text-3xl font-semibold tracking-tight text-slate-50"
      {...props}
    >
      {children}
    </h1>
  ),
  h2: ({ children, ...props }) => {
    const text = headingText(children);
    if (isSectionZone(text)) {
      return (
        <h2
          className="mb-4 mt-12 border-t border-slate-800 pt-10 font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400"
          {...props}
        >
          {children}
        </h2>
      );
    }
    return (
      <h2 className="mb-3 mt-8 text-lg font-semibold text-slate-200" {...props}>
        {children}
      </h2>
    );
  },
  h3: ({ children, ...props }) => {
    const text = headingText(children);
    if (isSectionZone(text)) {
      return (
        <h3
          className="mb-4 mt-12 border-t border-slate-800 pt-10 font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400"
          {...props}
        >
          {children}
        </h3>
      );
    }
    return (
      <h3 className="mb-2 mt-6 text-base font-semibold text-slate-300" {...props}>
        {children}
      </h3>
    );
  },
  p: ({ children, ...props }) => (
    <p className="mb-4 text-sm leading-relaxed text-slate-300" {...props}>
      {children}
    </p>
  ),
  strong: ({ children, ...props }) => (
    <strong className="font-semibold text-slate-100" {...props}>
      {children}
    </strong>
  ),
  blockquote: ({ children, ...props }) => (
    <blockquote
      className="mb-6 border-l-2 border-slate-600 bg-slate-900/60 py-3 pl-4 text-sm italic text-slate-300"
      {...props}
    >
      {children}
    </blockquote>
  ),
  ul: ({ children, ...props }) => (
    <ul className="mb-4 list-disc space-y-2 pl-6 text-sm text-slate-300" {...props}>
      {children}
    </ul>
  ),
  ol: ({ children, ...props }) => (
    <ol className="mb-4 list-decimal space-y-2 pl-6 text-sm text-slate-300" {...props}>
      {children}
    </ol>
  ),
  li: ({ children, ...props }) => (
    <li className="leading-relaxed" {...props}>
      {children}
    </li>
  ),
  code: ({ children, className, ...props }) => {
    const isBlock = className?.includes("language-");
    if (isBlock) {
      return (
        <code className={`font-mono text-xs text-slate-200 ${className ?? ""}`} {...props}>
          {children}
        </code>
      );
    }
    return (
      <code
        className="rounded border border-slate-800 bg-slate-900 px-1.5 py-0.5 font-mono text-xs text-slate-200"
        {...props}
      >
        {children}
      </code>
    );
  },
  pre: ({ children, ...props }) => (
    <pre
      className="my-5 overflow-x-auto rounded-lg border border-slate-800 bg-slate-950 p-4 font-mono text-xs leading-relaxed text-slate-200"
      {...props}
    >
      {children}
    </pre>
  ),
  a: ({ children, href, ...props }) => (
    <a
      href={href}
      className="text-slate-100 underline decoration-slate-600 underline-offset-2 hover:decoration-slate-300"
      rel="noopener noreferrer"
      {...props}
    >
      {children}
    </a>
  ),
};

type BriefingMarkdownProps = {
  markdown: string;
};

export default function BriefingMarkdown({ markdown }: BriefingMarkdownProps) {
  const safe = stripDangerousMarkdown(markdown);

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      disallowedElements={[...DISALLOWED_MARKDOWN_ELEMENTS]}
      unwrapDisallowed
      urlTransform={sanitizeMarkdownUrl}
      components={briefingComponents}
    >
      {safe}
    </ReactMarkdown>
  );
}
