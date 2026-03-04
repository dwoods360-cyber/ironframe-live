"use client";

import { useRef, useEffect } from "react";
import { useScenarioStore, type ScenarioPreset } from "@/app/store/scenarioStore";
import { appendAuditLog } from "@/app/utils/auditLogger";

const PRESETS: { label: string; value: NonNullable<ScenarioPreset> }[] = [
  { label: "Supply Chain Collapse", value: "Supply Chain Collapse" },
  { label: "Ransomware Surge", value: "Ransomware Surge" },
  { label: "Regulatory Crackdown", value: "Regulatory Crackdown" },
];

export default function RiskScenarioSimulator() {
  const activeScenario = useScenarioStore((s) => s.activeScenario);
  const setActiveScenario = useScenarioStore((s) => s.setActiveScenario);
  const sprintCloseLogged = useRef(false);

  useEffect(() => {
    if (sprintCloseLogged.current || typeof window === "undefined") return;
    sprintCloseLogged.current = true;
    appendAuditLog({
      action_type: "SPRINT_CLOSE",
      log_type: "APP_SYSTEM",
      description:
        "Process Validation complete. KIMBOT/GRCBOT online. Ready for Vendor Risk module.",
      metadata_tag: "SPRINT_CLOSE|Process Validation",
    });
  }, []);

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-950/40 p-4">
      <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-200">
        Risk Scenario Simulator
      </p>
      <p className="mb-3 text-[11px] text-slate-500">
        What-if presets temporarily pivot Liability Exposure and Executive Summary to a projected risk state by industry profile.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        {PRESETS.map(({ label, value }) => (
          <button
            key={value}
            type="button"
            onClick={() => setActiveScenario(activeScenario === value ? null : value)}
            className={`rounded border px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide transition-all ${
              activeScenario === value
                ? "border-amber-500/70 bg-amber-500/20 text-amber-300"
                : "border-slate-700 bg-slate-900/50 text-slate-300 hover:border-slate-600 hover:text-white"
            }`}
          >
            {label}
          </button>
        ))}
        {activeScenario && (
          <button
            type="button"
            onClick={() => setActiveScenario(null)}
            className="rounded border border-slate-600 bg-slate-800/50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400 hover:text-white"
          >
            Clear
          </button>
        )}
      </div>
      {activeScenario && (
        <p className="mt-2 text-[10px] text-amber-400">
          Projected risk view active — metrics below reflect &quot;{activeScenario}&quot; scenario.
        </p>
      )}
    </div>
  );
}
