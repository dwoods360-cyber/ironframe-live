"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";

import InTenantSupportContextPanel from "@/app/components/support/InTenantSupportContextPanel";
import { useTenantContext } from "@/app/context/TenantProvider";
import { assertTenantSupportFetchPath } from "@/app/lib/support/supportApiBoundary";
import { resolveSupportFrameworkContext } from "@/app/lib/support/resolveSupportFrameworkContext";
import {
  resolveDefaultSupportObjective,
  SUPPORT_INTENT_OPTIONS,
} from "@/app/lib/support/supportIntentObjectives";
import { useInTenantSupportDrawerStore } from "@/app/store/inTenantSupportDrawerStore";
import type {
  InTenantSupportObjective,
  InTenantSupportTelemetry,
  InTenantSupportUrgency,
} from "@/app/types/inTenantSupportTelemetry";

const URGENCY_OPTIONS: Array<{ value: InTenantSupportUrgency; label: string }> = [
  { value: "ROUTINE", label: "General inquiry / optimization" },
  { value: "AUDIT_BLOCKER", label: "Active regulatory blocker" },
  { value: "DATA_INTEGRITY", label: "System integrity / export mismatch" },
];

type InTenantSupportModalProps = {
  onSubmitted?: () => void;
};

export default function InTenantSupportModal({ onSubmitted }: InTenantSupportModalProps) {
  const pathname = usePathname();
  const { tenantFetch } = useTenantContext();
  const presetUrgency = useInTenantSupportDrawerStore((s) => s.presetUrgency);
  const presetSurface = useInTenantSupportDrawerStore((s) => s.presetSurface);

  const frameworkContext = useMemo(() => resolveSupportFrameworkContext(pathname), [pathname]);
  const supportSurface = presetSurface ?? frameworkContext.toLowerCase();

  const [urgency, setUrgency] = useState<InTenantSupportUrgency>("ROUTINE");
  const [objective, setObjective] = useState<InTenantSupportObjective>("OTHER");
  const [notes, setNotes] = useState("");
  const [attachTelemetry, setAttachTelemetry] = useState(true);
  const [diagnosticsExpanded, setDiagnosticsExpanded] = useState(false);
  const [telemetry, setTelemetry] = useState<InTenantSupportTelemetry | null>(null);
  const [telemetryLoading, setTelemetryLoading] = useState(true);
  const [clientLatencyMs, setClientLatencyMs] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (presetUrgency) setUrgency(presetUrgency);
  }, [presetUrgency]);

  useEffect(() => {
    if (presetSurface === "export-scope") {
      setObjective("ANALYST_EXPORT");
      return;
    }
    setObjective(resolveDefaultSupportObjective(frameworkContext));
  }, [frameworkContext, presetSurface]);

  const requiresDetailNotes = objective === "OTHER";
  const canSubmit = !isSubmitting && (!requiresDetailNotes || notes.trim().length > 0);

  useEffect(() => {
    let cancelled = false;

    const loadTelemetry = async () => {
      setTelemetryLoading(true);
      const started = performance.now();
      try {
        const query = new URLSearchParams({
          surface: supportSurface,
          path: pathname || "/",
        });
        const contextPath = `/api/support/in-tenant-context?${query.toString()}`;
        assertTenantSupportFetchPath(contextPath.split("?")[0] ?? contextPath);
        const response = await tenantFetch(contextPath);
        if (!response.ok) {
          if (!cancelled) setTelemetry(null);
          return;
        }
        const data = (await response.json()) as InTenantSupportTelemetry;
        if (!cancelled) {
          setTelemetry(data);
          setClientLatencyMs(Math.round(performance.now() - started));
        }
      } catch {
        if (!cancelled) setTelemetry(null);
      } finally {
        if (!cancelled) setTelemetryLoading(false);
      }
    };

    void loadTelemetry();
    return () => {
      cancelled = true;
    };
  }, [pathname, supportSurface, tenantFetch]);

  async function handleFormSubmission(event: React.FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;

    setIsSubmitting(true);
    setSubmitMessage(null);
    setSubmitError(null);

    try {
      assertTenantSupportFetchPath("/api/support/in-tenant-ticket");
      const response = await tenantFetch("/api/support/in-tenant-ticket", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          urgency,
          objective,
          userNotes: notes.trim(),
          attachTelemetry,
          context: {
            surface: supportSurface,
            path: pathname || "/",
          },
          clientTimestamp: new Date().toISOString(),
          clientLatencyMs: clientLatencyMs ?? undefined,
          frameworkContext,
        }),
      });

      const data = (await response.json()) as { reply?: string; error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "SUPPORT_INGRESS_FAILED");
      }

      setNotes("");
      setSubmitMessage(data.reply ?? "Support ticket dispatched with session diagnostics.");
      onSubmitted?.();
    } catch (error) {
      console.error("Critical support transmission failure:", error);
      setSubmitError("Support dispatch failed. Retry or contact your platform administrator.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleFormSubmission}
      className="flex flex-col gap-4 text-slate-200"
      data-testid="in-tenant-support-modal"
    >
      <div>
        <label
          htmlFor="support-urgency"
          className="mb-1.5 block font-mono text-[11px] uppercase tracking-widest text-slate-400"
        >
          Operational urgency
        </label>
        <select
          id="support-urgency"
          value={urgency}
          onChange={(event) => setUrgency(event.target.value as InTenantSupportUrgency)}
          className="h-11 w-full touch-manipulation rounded-lg border border-slate-800 bg-slate-950/60 px-3 font-mono text-xs text-slate-300 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
        >
          {URGENCY_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label
          htmlFor="support-objective"
          className="mb-1.5 block font-mono text-[11px] uppercase tracking-widest text-slate-400"
        >
          What objective were you trying to execute?
        </label>
        <select
          id="support-objective"
          value={objective}
          onChange={(event) => setObjective(event.target.value as InTenantSupportObjective)}
          className="h-11 w-full touch-manipulation rounded-lg border border-slate-800 bg-slate-950/60 px-3 font-mono text-xs text-slate-300 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
        >
          {SUPPORT_INTENT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <p className="mt-1.5 text-[10px] text-slate-500">
          Pre-selected from your current route. Change it if you were pursuing a different task.
        </p>
      </div>

      <div>
        <label
          htmlFor="support-intent"
          className="mb-1.5 block font-mono text-[11px] uppercase tracking-widest text-slate-400"
        >
          {requiresDetailNotes ? "Describe the objective" : "Additional details (optional)"}
        </label>
        <textarea
          id="support-intent"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder={
            requiresDetailNotes
              ? "Describe the operational target or validation error encountered..."
              : "Add error text, expected outcome, or audit deadline context..."
          }
          rows={3}
          className="w-full resize-none rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
        />
      </div>

      <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-lg border border-slate-800/80 bg-slate-950/40 px-3 py-3">
        <input
          type="checkbox"
          checked={attachTelemetry}
          onChange={(event) => setAttachTelemetry(event.target.checked)}
          className="mt-1 h-4 w-4 shrink-0 accent-cyan-500"
        />
        <span className="text-xs leading-relaxed text-slate-300">
          Attach secure workspace diagnostics (tenant slug, billing state, export scope, route context).
          Required for export and audit blockers.
        </span>
      </label>

      <div className="rounded-lg border border-slate-800/80 bg-[#070e20]/50">
        <button
          type="button"
          onClick={() => setDiagnosticsExpanded((open) => !open)}
          className="flex h-11 w-full touch-manipulation items-center justify-between px-3 font-mono text-[10px] uppercase tracking-widest text-slate-400"
          aria-expanded={diagnosticsExpanded}
        >
          Attached diagnostics
          <ChevronDown
            className={`h-4 w-4 transition ${diagnosticsExpanded ? "rotate-180" : ""}`}
            aria-hidden
          />
        </button>
        <div className="grid grid-cols-2 gap-2 border-t border-slate-800/60 px-3 py-2 font-mono text-[10px] text-slate-500">
          <div>
            Route: <span className="text-indigo-300">{pathname || "/"}</span>
          </div>
          <div>
            Framework: <span className="text-indigo-300">{frameworkContext}</span>
          </div>
          {clientLatencyMs !== null ? (
            <div className="col-span-2">
              Context probe: <span className="text-cyan-300">{clientLatencyMs}ms</span>
            </div>
          ) : null}
        </div>
        {diagnosticsExpanded ? (
          <div className="border-t border-slate-800/60 p-3">
            <InTenantSupportContextPanel telemetry={telemetry} loading={telemetryLoading} />
          </div>
        ) : null}
      </div>

      {submitMessage ? (
        <p className="rounded-lg border border-emerald-500/30 bg-emerald-950/20 px-3 py-2 text-sm text-emerald-100">
          {submitMessage}
        </p>
      ) : null}
      {submitError ? (
        <p className="rounded-lg border border-red-500/30 bg-red-950/20 px-3 py-2 text-sm text-red-100">
          {submitError}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={!canSubmit}
        className="h-11 w-full touch-manipulation rounded-lg bg-cyan-600 font-mono text-xs font-bold uppercase tracking-widest text-slate-950 transition hover:bg-cyan-500 disabled:bg-slate-900 disabled:text-slate-600"
      >
        {isSubmitting ? "Transmitting..." : "Dispatch secure ticket"}
      </button>
    </form>
  );
}
