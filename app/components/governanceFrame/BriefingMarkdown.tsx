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
    h1: ({ children, node: _node, ...props }) => (
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
    h2: ({ children, node: _node, ...props }) => {
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
    h3: ({ children, node: _node, ...props }) => {
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
    p: ({ children, node: _node, ...props }) => (
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
    strong: ({ children, node: _node, ...props }) => (
      <strong
        className={institute ? "font-semibold text-[var(--gf-ink)]" : "font-semibold text-slate-100"}
        {...props}
      >
        {children}
      </strong>
    ),
    blockquote: ({ children, node: _node, ...props }) => (
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
    ul: ({ children, node: _node, ...props }) => (
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
    ol: ({ children, node: _node, ...props }) => (
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
    li: ({ children, node: _node, ...props }) => (
      <li className="leading-relaxed" {...props}>
        {children}
      </li>
    ),
    code: ({ children, className, node: _node, ...props }) => {
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
    pre: ({ children, node: _node, ...props }) => (
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
    a: ({ children, href, node: _node, ...props }) => (
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
    ...gfMarkdownTableComponents(institute ? "institute" : "dark"),
  };
}

/**
 * GFM column markers (`---:`) compile to `align` + inline `style.textAlign`.
 * Spreading those onto `th`/`td` after Tailwind `text-left` re-breaks the grid:
 * a “Public amount” column right-aligns $4,250,000 in row 1 and a wrapping
 * prose cell in row 2, so headers no longer sit over their bodies.
 * Do not spread GFM cell props. Use a full-width fixed grid so every row shares
 * one column set and the table cannot overflow the reading column.
 */
export function gfMarkdownTableComponents(tone: Tone): Pick<
  Components,
  "table" | "thead" | "tbody" | "tr" | "th" | "td"
> {
  const institute = tone === "institute";
  const cell =
    "px-3 py-2.5 text-left align-top break-words [overflow-wrap:anywhere] [&_p]:m-0";

  return {
    table: ({ children }) => (
      <div className="my-6 w-full min-w-0 max-w-full overflow-x-auto">
        <table
          className={
            institute
              ? "w-full max-w-full table-fixed border-collapse text-left font-[family-name:var(--font-gf-sans)] text-[14px] text-[var(--gf-ink-soft)]"
              : "w-full max-w-full table-fixed border-collapse text-left text-sm text-slate-300"
          }
        >
          {children}
        </table>
      </div>
    ),
    thead: ({ children }) => <thead>{children}</thead>,
    tbody: ({ children }) => <tbody>{children}</tbody>,
    tr: ({ children }) => <tr>{children}</tr>,
    th: ({ children }) => (
      <th
        scope="col"
        className={
          institute
            ? `${cell} border border-[var(--gf-line)] bg-[color-mix(in_srgb,var(--gf-paper-elevated)_88%,white)] font-[family-name:var(--font-gf-sans)] text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--gf-muted)]`
            : `${cell} border border-slate-700 bg-slate-900/80 font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400`
        }
      >
        {children}
      </th>
    ),
    td: ({ children }) => (
      <td
        className={
          institute
            ? `${cell} border border-[var(--gf-line)] bg-[var(--gf-paper-elevated)] leading-relaxed`
            : `${cell} border border-slate-800 leading-relaxed`
        }
      >
        {children}
      </td>
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
