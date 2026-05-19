"use client";

import { useMemo } from "react";
import { Radiation } from "lucide-react";
import {
  CHAOS_REGISTRY,
  isConstitutionalChaosDrill,
  type ChaosRegistryScenarioId,
} from "@/app/config/chaosRegistry";

export type ChaosMenuSelection = ChaosRegistryScenarioId | "";

type Props = {
  value: ChaosMenuSelection;
  onChange: (value: ChaosMenuSelection, label: string) => void;
  disabled?: boolean;
  /** Standard threat-inject scenarios only (excludes constitutional collapse). */
  threatDrillsOnly?: boolean;
  className?: string;
};

export default function ChaosMenu({
  value,
  onChange,
  disabled = false,
  threatDrillsOnly = false,
  className = "",
}: Props) {
  const entries = useMemo(
    () =>
      CHAOS_REGISTRY.filter((e) =>
        threatDrillsOnly ? !e.constitutionalDrill : true,
      ),
    [threatDrillsOnly],
  );

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <label className="text-[8px] font-bold uppercase tracking-widest text-cyan-500/90">
        Chaos scenario
      </label>
      <div className="flex flex-col gap-1.5">
        {entries.map((entry) => {
          const nuclear = isConstitutionalChaosDrill(entry.id);
          const selected = value === entry.id;
          return (
            <button
              key={entry.id}
              type="button"
              disabled={disabled}
              onClick={() => onChange(entry.id, entry.label)}
              className={[
                "group relative flex w-full items-start gap-2 rounded-sm border px-2 py-2 text-left transition-all",
                nuclear
                  ? "border-rose-500/90 bg-gradient-to-r from-rose-950/80 via-rose-950/40 to-zinc-950/90 shadow-[0_0_12px_rgba(244,63,94,0.35)]"
                  : "border-cyan-800/50 bg-zinc-950/80 hover:border-cyan-600/70",
                selected ? "ring-1 ring-cyan-400/80" : "",
                nuclear && selected ? "animate-pulse ring-rose-400/90" : "",
                disabled ? "opacity-50" : "",
              ].join(" ")}
            >
              {nuclear ? (
                <Radiation
                  className="mt-0.5 h-4 w-4 shrink-0 text-rose-300 drop-shadow-[0_0_6px_rgba(251,113,133,0.9)]"
                  aria-hidden
                />
              ) : (
                <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-cyan-500/70" aria-hidden />
              )}
              <span className="min-w-0 flex-1">
                <span
                  className={[
                    "block text-[9px] font-black uppercase tracking-wide",
                    nuclear ? "text-rose-100" : "text-cyan-100",
                  ].join(" ")}
                >
                  {nuclear
                    ? "Constitutional Collapse (Hard Wipe Simulation)"
                    : entry.label}
                </span>
                <span className="mt-0.5 block text-[7px] leading-snug text-zinc-400">
                  {entry.description}
                </span>
                {nuclear ? (
                  <span className="mt-1 inline-block rounded border border-rose-600/60 px-1 py-0.5 text-[6px] font-bold uppercase text-rose-200">
                    Nuclear drill · 240s DMS
                  </span>
                ) : null}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
