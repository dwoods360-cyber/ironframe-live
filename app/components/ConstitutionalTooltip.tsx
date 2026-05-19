"use client";

import type { MouseEvent } from "react";
import { FileSearch } from "lucide-react";
import Link from "next/link";

import { resolveTasConstitutionHref } from "@/app/utils/tasConstitutionDeepLink";

export type ConstitutionalTooltipTheme = "parchment" | "slate";

export function constitutionalTooltipShellClasses(theme: ConstitutionalTooltipTheme): string {
  if (theme === "parchment") {
    return [
      "max-w-[18rem] rounded-sm border border-amber-900/30 bg-[#f4edd8]/98 px-3 py-2.5 text-[11px] leading-snug text-stone-900 shadow-2xl",
      "font-serif tracking-tight",
    ].join(" ");
  }
  return [
    "max-w-[18rem] rounded-md border border-slate-600/90 bg-slate-950 px-3 py-2.5 text-[10px] leading-relaxed text-slate-100 shadow-2xl",
    "font-mono tracking-tight",
  ].join(" ");
}

export type ConstitutionalTooltipPanelProps = {
  theme: ConstitutionalTooltipTheme;
  directiveLabel: string;
  summary: string;
  anchorId: string;
  tasLine: number;
  /** Shortened live `docs/TAS.md` digest for non-repudiation (e.g. `7f83b1…3a92`). */
  fingerprintSha256Short?: string | null;
  onLinkClick?: (e: MouseEvent) => void;
};

export function ConstitutionalTooltipPanel({
  theme,
  directiveLabel,
  summary,
  anchorId,
  tasLine,
  fingerprintSha256Short,
  onLinkClick,
}: ConstitutionalTooltipPanelProps) {
  const href = resolveTasConstitutionHref(anchorId, tasLine);
  const isVscode = href.startsWith("vscode:");
  const linkClass =
    "pointer-events-auto mt-2 inline-flex items-center gap-1.5 rounded border border-current/30 px-2 py-1 text-[8px] font-black uppercase tracking-widest opacity-95 transition-opacity hover:opacity-100";

  const inner = (
    <>
      <FileSearch className="h-3 w-3 shrink-0 opacity-80" strokeWidth={2.5} aria-hidden />
      View in TAS.md
    </>
  );

  return (
    <div
      className={`pointer-events-auto ${constitutionalTooltipShellClasses(theme)}`}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="pointer-events-none mb-1.5 inline-flex items-center gap-1.5">
        <span className="rounded border border-current/25 px-1 py-0.5 text-[7px] font-black uppercase tracking-widest opacity-90">
          [TAS DIRECTIVE]
        </span>
        <span className="text-[9px] font-bold opacity-80">{directiveLabel}</span>
      </div>
      <p className="pointer-events-none m-0 font-semibold opacity-95">{summary}</p>
      {fingerprintSha256Short ? (
        <div
          className={`pointer-events-none mt-2 border-t pt-2 ${
            theme === "parchment" ? "border-amber-900/25" : "border-slate-600/60"
          }`}
        >
          <p className="mb-0.5 text-[7px] font-black uppercase tracking-widest opacity-75">Ledger</p>
          <p className="m-0 break-all font-mono text-[9px] font-semibold tabular-nums opacity-95">
            SHA-256: {fingerprintSha256Short}
          </p>
          <p
            className={`mt-1 text-[7px] font-black uppercase tracking-widest ${
              theme === "parchment" ? "text-emerald-800/95" : "text-emerald-400/95"
            }`}
          >
            [INTEGRITY VERIFIED]
          </p>
        </div>
      ) : null}
      {isVscode ? (
        <a href={href} className={linkClass} onClick={onLinkClick}>
          {inner}
        </a>
      ) : (
        <Link href={href} target="_blank" rel="noopener noreferrer" className={linkClass} onClick={onLinkClick}>
          {inner}
        </Link>
      )}
    </div>
  );
}
