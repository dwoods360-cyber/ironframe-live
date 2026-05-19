"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, FileText } from "lucide-react";

export type InlineAuditAccordionProps = {
  markdownAuditBlock: string;
};

export function InlineAuditAccordion({ markdownAuditBlock }: InlineAuditAccordionProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div
      className="mt-3 overflow-hidden rounded-md border border-slate-800 bg-slate-950/50"
      data-testid="inline-audit-accordion"
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="flex w-full items-center justify-between px-3 py-2 font-mono text-xs text-slate-400 transition-colors hover:bg-slate-900/50 hover:text-slate-200"
        aria-expanded={isOpen}
      >
        <span className="flex items-center gap-2">
          <FileText className="h-3.5 w-3.5 text-cyan-500" aria-hidden />
          <span>[ AGENT REUSE TRAIL: {isOpen ? "HIDE" : "SHOW"} ]</span>
        </span>
        {isOpen ? (
          <ChevronUp className="h-3.5 w-3.5" aria-hidden />
        ) : (
          <ChevronDown className="h-3.5 w-3.5" aria-hidden />
        )}
      </button>

      {isOpen ? (
        <div
          className="max-h-60 overflow-y-auto border-t border-slate-800 bg-slate-950 p-3 font-mono text-[11px] leading-relaxed text-slate-300"
          data-testid="inline-audit-accordion-body"
        >
          <pre className="whitespace-pre-wrap font-mono selection:bg-cyan-500/20 selection:text-cyan-300">
            {markdownAuditBlock}
          </pre>
        </div>
      ) : null}
    </div>
  );
}
