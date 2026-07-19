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
  /^(I{1,4})\.\s|Exposure Vector|Calculated Quantitative Impact|Quantitative Context|Quantitative Impact|Economic Context|Machine-Rule Technical Translation|What Modern GRC Must Enforce|Architectural Implications|Control-System Requirements|Verification Protocol/i;

function headingText(children: React.ReactNode): string {
  if (typeof children === "string") return children;
  if (Array.isArray(children)) return children.map(String).join("");
  return String(children ?? "");
}

function isSectionZone(text: string): boolean {
  return SECTION_HEADING.test(text.replace(/\*\*/g, "").trim());
}

type Tone = "dark" | "institute";

function componentsForTone(tone: Tone): Components {
  const institute = tone === "institute";

  return {
    h1: ({ children, ...props }) => (
      <h1
        className={
          institute
            ? "mb-8 border-b border-[var(--gf-line)] pb-4 font-[family-name:var(--font-gf-serif)] text-3xl font-semibold tracking-tight text-[var(--gf-ink)]"
            : "mb-8 border-b border-slate-800 pb-4 text-3xl font-semibold tracking-tight text-slate-50"
        }
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
            className={
              institute
                ? "mb-4 mt-12 border-t border-[var(--gf-line)] pt-10 font-[family-name:var(--font-gf-sans)] text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--gf-muted)]"
                : "mb-4 mt-12 border-t border-slate-800 pt-10 font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400"
            }
            {...props}
          >
            {children}
          </h2>
        );
      }
      return (
        <h2
          className={
            institute
              ? "mb-3 mt-8 font-[family-name:var(--font-gf-serif)] text-xl font-semibold text-[var(--gf-ink)]"
              : "mb-3 mt-8 text-lg font-semibold text-slate-200"
          }
          {...props}
        >
          {children}
        </h2>
      );
    },
    h3: ({ children, ...props }) => {
      const text = headingText(children);
      if (isSectionZone(text)) {
        return (
          <h3
            className={
              institute
                ? "mb-4 mt-12 border-t border-[var(--gf-line)] pt-10 font-[family-name:var(--font-gf-sans)] text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--gf-muted)]"
                : "mb-4 mt-12 border-t border-slate-800 pt-10 font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400"
            }
            {...props}
          >
            {children}
          </h3>
        );
      }
      return (
        <h3
          className={
            institute
              ? "mb-2 mt-6 font-[family-name:var(--font-gf-serif)] text-lg font-semibold text-[var(--gf-ink-soft)]"
              : "mb-2 mt-6 text-base font-semibold text-slate-300"
          }
          {...props}
        >
          {children}
        </h3>
      );
    },
    p: ({ children, ...props }) => (
      <p
        className={
          institute
            ? "mb-4 font-[family-name:var(--font-gf-sans)] text-[15px] leading-relaxed text-[var(--gf-ink-soft)]"
            : "mb-4 text-sm leading-relaxed text-slate-300"
        }
        {...props}
      >
        {children}
      </p>
    ),
    strong: ({ children, ...props }) => (
      <strong
        className={institute ? "font-semibold text-[var(--gf-ink)]" : "font-semibold text-slate-100"}
        {...props}
      >
        {children}
      </strong>
    ),
    blockquote: ({ children, ...props }) => (
      <blockquote
        className={
          institute
            ? "mb-6 border-l-2 border-[var(--gf-accent)] bg-white/60 py-3 pl-4 font-[family-name:var(--font-gf-serif)] text-[15px] italic text-[var(--gf-ink-soft)]"
            : "mb-6 border-l-2 border-slate-600 bg-slate-900/60 py-3 pl-4 text-sm italic text-slate-300"
        }
        {...props}
      >
        {children}
      </blockquote>
    ),
    ul: ({ children, ...props }) => (
      <ul
        className={
          institute
            ? "mb-4 list-disc space-y-2 pl-6 font-[family-name:var(--font-gf-sans)] text-[15px] text-[var(--gf-ink-soft)]"
            : "mb-4 list-disc space-y-2 pl-6 text-sm text-slate-300"
        }
        {...props}
      >
        {children}
      </ul>
    ),
    ol: ({ children, ...props }) => (
      <ol
        className={
          institute
            ? "mb-4 list-decimal space-y-2 pl-6 font-[family-name:var(--font-gf-sans)] text-[15px] text-[var(--gf-ink-soft)]"
            : "mb-4 list-decimal space-y-2 pl-6 text-sm text-slate-300"
        }
        {...props}
      >
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
          <code
            className={`font-mono text-xs ${institute ? "text-[var(--gf-ink)]" : "text-slate-200"} ${className ?? ""}`}
            {...props}
          >
            {children}
          </code>
        );
      }
      return (
        <code
          className={
            institute
              ? "rounded border border-[var(--gf-line)] bg-white px-1.5 py-0.5 font-mono text-xs text-[var(--gf-ink)]"
              : "rounded border border-slate-800 bg-slate-900 px-1.5 py-0.5 font-mono text-xs text-slate-200"
          }
          {...props}
        >
          {children}
        </code>
      );
    },
    pre: ({ children, ...props }) => (
      <pre
        className={
          institute
            ? "my-5 overflow-x-auto rounded-lg border border-[var(--gf-line)] bg-white p-4 font-mono text-xs leading-relaxed text-[var(--gf-ink)]"
            : "my-5 overflow-x-auto rounded-lg border border-slate-800 bg-slate-950 p-4 font-mono text-xs leading-relaxed text-slate-200"
        }
        {...props}
      >
        {children}
      </pre>
    ),
    a: ({ children, href, ...props }) => (
      <a
        href={href}
        className={
          institute
            ? "text-[var(--gf-accent)] underline decoration-[var(--gf-line)] underline-offset-2 hover:decoration-[var(--gf-accent)]"
            : "text-slate-100 underline decoration-slate-600 underline-offset-2 hover:decoration-slate-300"
        }
        rel="noopener noreferrer"
        {...props}
      >
        {children}
      </a>
    ),
  };
}

type BriefingMarkdownProps = {
  markdown: string;
  /** `institute` = Governance Frame public research site (light). Default keeps legacy dark reader. */
  tone?: Tone;
};

export default function BriefingMarkdown({ markdown, tone = "dark" }: BriefingMarkdownProps) {
  const safe = stripDangerousMarkdown(markdown);

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      disallowedElements={[...DISALLOWED_MARKDOWN_ELEMENTS]}
      unwrapDisallowed
      urlTransform={sanitizeMarkdownUrl}
      components={componentsForTone(tone)}
    >
      {safe}
    </ReactMarkdown>
  );
}
