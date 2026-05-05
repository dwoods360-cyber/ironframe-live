"use client";

import { useMemo, useState, useTransition } from "react";
import {
  triggerSentinelHunch,
  type SentinelObservedSymptom,
} from "@/app/actions/sentinelActions";

type ComplianceFramework = "SOC2" | "ISO27001" | "NIST";

const SYMPTOM_OPTIONS: Array<{ value: SentinelObservedSymptom; label: string }> = [
  { value: "PERFORMANCE_DROP", label: "Performance Drop" },
  { value: "UNAUTHORIZED_ACCESS", label: "Unauthorized Access" },
  { value: "DATA_DRIFT", label: "Data Drift" },
  { value: "SERVICE_DEGRADATION", label: "Service Degradation" },
  { value: "INTEGRITY_ALERT", label: "Integrity Alert" },
  { value: "OTHER", label: "Other" },
];

type Props = {
  assetOptions: string[];
};

export default function SentinelIntakeForm({ assetOptions }: Props) {
  const options = useMemo(() => {
    const clean = assetOptions.map((a) => a.trim()).filter(Boolean);
    return clean.length > 0 ? [...new Set(clean)] : ["General Infrastructure"];
  }, [assetOptions]);

  const [targetAsset, setTargetAsset] = useState(options[0] ?? "General Infrastructure");
  const [observedSymptom, setObservedSymptom] =
    useState<SentinelObservedSymptom>("PERFORMANCE_DROP");
  const [confidenceLevel, setConfidenceLevel] = useState(60);
  const [complianceFramework, setComplianceFramework] = useState<ComplianceFramework>("SOC2");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const submit = () => {
    setFeedback(null);
    startTransition(async () => {
      const result = await triggerSentinelHunch({
        targetAsset,
        observedSymptom,
        confidenceLevel,
        complianceFramework,
      });
      if (!result.ok) {
        setFeedback(result.error);
        return;
      }
      setFeedback(`Deficiency discovery queued (${result.threatId}).`);
    });
  };

  return (
    <section className="rounded border border-violet-900/50 bg-slate-950/70 p-3">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-[11px] font-bold uppercase tracking-wide text-violet-200">Deficiency Discovery Gate</h3>
        <span className="text-[9px] text-violet-300/80">GRC control hypothesis</span>
      </div>

      <label className="mb-2 block text-[10px] text-slate-300">
        Target Asset
        <select
          value={targetAsset}
          onChange={(e) => setTargetAsset(e.target.value)}
          className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-100"
        >
          {options.map((asset) => (
            <option key={asset} value={asset}>
              {asset}
            </option>
          ))}
        </select>
      </label>

      <label className="mb-2 block text-[10px] text-slate-300">
        Which Control Deficiency are you observing?
        <select
          value={observedSymptom}
          onChange={(e) => setObservedSymptom(e.target.value as SentinelObservedSymptom)}
          className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-100"
        >
          {SYMPTOM_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label className="mb-2 block text-[10px] text-slate-300">
        Which Compliance Framework is affected?
        <select
          value={complianceFramework}
          onChange={(e) => setComplianceFramework(e.target.value as ComplianceFramework)}
          className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-100"
        >
          <option value="SOC2">SOC 2</option>
          <option value="ISO27001">ISO 27001</option>
          <option value="NIST">NIST</option>
        </select>
      </label>

      <label className="mb-2 block text-[10px] text-slate-300">
        Confidence Level ({confidenceLevel}%)
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={confidenceLevel}
          onChange={(e) => setConfidenceLevel(Number(e.target.value))}
          className="mt-1 w-full accent-violet-400"
        />
      </label>

      <button
        type="button"
        onClick={submit}
        disabled={isPending}
        className="w-full rounded border border-violet-700 bg-violet-900/40 px-2 py-1.5 text-[11px] font-semibold text-violet-100 disabled:opacity-60"
      >
        {isPending ? "Submitting..." : "Record deficiency hypothesis"}
      </button>

      {feedback ? <p className="mt-2 text-[10px] text-violet-200/90">{feedback}</p> : null}
    </section>
  );
}
