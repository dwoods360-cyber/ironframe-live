"use client";

import type { ReactNode } from "react";

import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import {
  parseBriefingSections,
  parseImpactMetrics,
  type BriefingSectionId,
} from "@/app/lib/governanceFrame/parseBriefingSections";
import {
  DISALLOWED_MARKDOWN_ELEMENTS,
  sanitizeMarkdownUrl,
  stripDangerousMarkdown,
} from "@/app/lib/governanceFrame/sanitizeMarkdown";

function highlightTypescript(source: string): ReactNode[] {
  const keyword =
    /\b(const|let|var|function|return|if|else|import|from|export|type|interface|async|await|new)\b/g;
  const comment = /(\/\/.*$)/gm;
  const stringLit = /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)/g;

  const nodes: ReactNode[] = [];
  let last = 0;
  const spans: Array<{ start: number; end: number; className: string }> = [];

  for (const match of source.matchAll(comment)) {
    if (match.index != null) {
      spans.push({ start: match.index, end: match.index + match[0].length, className: "text-slate-500" });
    }
  }
  for (const match of source.matchAll(stringLit)) {
    if (match.index != null) {
      spans.push({ start: match.index, end: match.index + match[0].length, className: "text-emerald-400/90" });
    }
  }
  for (const match of source.matchAll(keyword)) {
    if (match.index != null) {
      spans.push({ start: match.index, end: match.index + match[0].length, className: "text-sky-400" });
    }
  }

  spans.sort((a, b) => a.start - b.start || b.end - a.end - (a.end - a.start));

  const occupied = new Set<number>();
  const merged: typeof spans = [];
  for (const span of spans) {
    let overlap = false;
    for (let i = span.start; i < span.end; i++) {
      if (occupied.has(i)) {
        overlap = true;
        break;
      }
    }
    if (overlap) continue;
    for (let i = span.start; i < span.end; i++) occupied.add(i);
    merged.push(span);
  }

  merged.sort((a, b) => a.start - b.start);
  for (const span of merged) {
    if (span.start > last) {
      nodes.push(<span key={`t-${last}`}>{source.slice(last, span.start)}</span>);
    }
    nodes.push(
      <span key={`s-${span.start}`} className={span.className}>
        {source.slice(span.start, span.end)}
      </span>,
    );
    last = span.end;
  }
  if (last < source.length) {
    nodes.push(<span key={`t-${last}`}>{source.slice(last)}</span>);
  }

  return nodes.length ? nodes : [source];
}

const sansComponents: Components = {
  p: ({ children, ...props }) => (
    <p className="mb-4 font-sans text-sm leading-relaxed text-slate-300" {...props}>
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
      className="mb-6 border-l-2 border-slate-600 bg-slate-900/60 py-3 pl-4 font-sans text-sm italic text-slate-300"
      {...props}
    >
      {children}
    </blockquote>
  ),
  ul: ({ children, ...props }) => (
    <ul className="mb-4 list-disc space-y-2 pl-6 font-sans text-sm text-slate-300" {...props}>
      {children}
    </ul>
  ),
  li: ({ children, ...props }) => (
    <li className="leading-relaxed" {...props}>
      {children}
    </li>
  ),
};

const machineRuleComponents: Components = {
  ...sansComponents,
  pre: ({ children, ...props }) => (
    <pre
      className="my-4 overflow-x-auto rounded-lg border-2 border-slate-700 bg-slate-950 p-4 font-mono text-xs leading-relaxed text-slate-200 shadow-inner shadow-black/50"
      {...props}
    >
      {children}
    </pre>
  ),
  code: ({ children, className, ...props }) => {
    const isBlock = className?.includes("language-");
    const text = String(children ?? "").replace(/\n$/, "");
    if (isBlock) {
      const lang = className?.match(/language-(\w+)/)?.[1] ?? "";
      return (
        <code className="font-mono text-xs" {...props}>
          {lang === "typescript" || lang === "ts" ? highlightTypescript(text) : text}
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
};

function SectionZoneHeading({ title }: { title: string }) {
  return (
    <h2 className="mb-5 mt-12 border-t border-slate-800 pt-10 font-mono text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400">
      {title}
    </h2>
  );
}

function ImpactMetricsTable({ body }: { body: string }) {
  const rows = parseImpactMetrics(body);
  const prose = body
    .split(/\r?\n/)
    .filter((line) => !line.trim().match(/^-\s+\*\*/))
    .join("\n")
    .trim();

  return (
    <div className="space-y-5">
      {rows.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900/80">
          <table className="w-full min-w-[20rem] border-collapse font-mono text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-left text-[10px] uppercase tracking-widest text-slate-500">
                <th className="px-4 py-3 font-bold">Metric register</th>
                <th className="px-4 py-3 font-bold">Raw allocation</th>
                <th className="px-4 py-3 font-bold text-right">BigInt (¢)</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.label} className="border-b border-slate-800/80 last:border-0">
                  <td className="px-4 py-3 text-slate-300">{row.label}</td>
                  <td className="px-4 py-3 text-slate-500">{row.rawDisplay}</td>
                  <td className="px-4 py-3 text-right font-bold tabular-nums text-slate-100">
                    {row.cents}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      {prose ? (
        <SafeMarkdown markdown={prose} components={sansComponents} />
      ) : null}
    </div>
  );
}

function SafeMarkdown({
  markdown,
  components,
}: {
  markdown: string;
  components: Components;
}) {
  const safe = stripDangerousMarkdown(markdown);
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      disallowedElements={[...DISALLOWED_MARKDOWN_ELEMENTS]}
      unwrapDisallowed
      urlTransform={sanitizeMarkdownUrl}
      components={components}
    >
      {safe}
    </ReactMarkdown>
  );
}

function renderSection(id: BriefingSectionId, title: string, body: string) {
  const trimmed = body.trim();
  if (!trimmed && !title) return null;

  if (id === "impact") {
    return (
      <section key={id} aria-labelledby={`section-${id}`}>
        <SectionZoneHeading title={title} />
        <ImpactMetricsTable body={trimmed} />
      </section>
    );
  }

  if (id === "machine-rule") {
    return (
      <section
        key={id}
        aria-labelledby={`section-${id}`}
        className="rounded-xl border-2 border-slate-800 bg-slate-900/30 p-6"
      >
        <SectionZoneHeading title={title} />
        <SafeMarkdown markdown={trimmed} components={machineRuleComponents} />
      </section>
    );
  }

  const components = id === "exposure" || id === "preamble" ? sansComponents : machineRuleComponents;

  return (
    <section key={id} aria-labelledby={`section-${id}`}>
      {title ? <SectionZoneHeading title={title} /> : null}
      <SafeMarkdown markdown={trimmed} components={components} />
    </section>
  );
}

type BriefingFrameContentProps = {
  markdown: string;
};

export default function BriefingFrameContent({ markdown }: BriefingFrameContentProps) {
  const sections = parseBriefingSections(stripDangerousMarkdown(markdown));

  return (
    <div className="text-slate-100">
      {sections.map((section) => renderSection(section.id, section.title, section.body))}
    </div>
  );
}
