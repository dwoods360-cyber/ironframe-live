"use client";

import type { OpSupportWorkspaceTab } from "@/app/lib/opsupportDashTypes";

const tabs: { id: OpSupportWorkspaceTab; label: string; sub: string }[] = [
  { id: "ingestion", label: "Ingestion stream", sub: "Clearance queue" },
  { id: "simAudit", label: "Simulation audit", sub: "Non-golden trail" },
  { id: "diagnostic", label: "Diagnostic history", sub: "Reliability dashboard" },
];

export type OpSupportTabStripProps = {
  value: OpSupportWorkspaceTab;
  onChange: (next: OpSupportWorkspaceTab) => void;
};

export function OpSupportTabStrip({ value, onChange }: OpSupportTabStripProps) {
  return (
    <div className="border-b border-zinc-800/90 bg-[#06060a] px-4 pt-2 sm:px-6">
      <div
        role="tablist"
        aria-label="Operational support workspace"
        className="mx-auto flex max-w-[1600px] flex-wrap gap-1"
      >
        {tabs.map((t) => {
          const active = value === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={active}
              id={`opsupport-tab-${t.id}`}
              aria-controls={`opsupport-panel-${t.id}`}
              onClick={() => onChange(t.id)}
              className={`relative rounded-t-md border border-b-0 px-3 py-2 text-left transition-colors sm:min-w-[180px] ${
                active
                  ? "border-zinc-600 bg-[#08080f] text-zinc-100 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]"
                  : "border-transparent bg-transparent text-zinc-500 hover:border-zinc-800 hover:bg-zinc-950/60 hover:text-zinc-300"
              }`}
            >
              <span className="block font-mono text-[10px] font-black uppercase tracking-widest">{t.label}</span>
              <span className="mt-0.5 block font-mono text-[9px] text-zinc-500">{t.sub}</span>
              {active ? (
                <span
                  className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-cyan-500/70 to-transparent"
                  aria-hidden
                />
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
