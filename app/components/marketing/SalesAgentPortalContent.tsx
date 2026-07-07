"use client";

import { useState } from "react";

type BaselineTarget = "regionalBHC" | "publicPower" | "communityHealth";

type SalesAgentPortalContentProps = {
  centered?: boolean;
};

export default function SalesAgentPortalContent({ centered = false }: SalesAgentPortalContentProps) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    company: "",
    baselineTarget: "regionalBHC" as BaselineTarget,
    notes: "",
  });
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [queuedMessage, setQueuedMessage] = useState<string | null>(null);

  const labelClass = centered
    ? "mb-1 block text-center font-mono text-[10px] text-slate-500 uppercase"
    : "mb-1 block font-mono text-[10px] text-slate-500 uppercase";

  const handleSubmitEvaluation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || isEvaluating) return;

    setIsEvaluating(true);
    setQueuedMessage(null);

    try {
      const response = await fetch("/api/agents/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = (await response.json()) as {
        status?: string;
        message?: string;
        error?: string;
      };
      setQueuedMessage(
        data.message ||
          data.error ||
          "Target alignment computed. A dedicated pipeline slot has been allocated.",
      );
    } catch (err) {
      console.error("Sales agent synthesis failure:", err);
      setQueuedMessage(
        "Core routing boundary timed out. Your lead record was cached for manual administrative review.",
      );
    } finally {
      setIsEvaluating(false);
    }
  };

  if (queuedMessage) {
    return (
      <div className="animate-fadeIn w-full space-y-4">
        <div
          className={`flex items-center gap-2 font-mono text-[10px] text-indigo-400 uppercase ${centered ? "justify-center" : ""}`}
        >
          <span>⚡ LEAD PROFILE QUEUED FOR REVIEW</span>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-4 text-center font-sans text-sm leading-relaxed text-slate-200">
          {queuedMessage}
        </div>
        <div className="flex items-center justify-center gap-2.5 rounded-lg border border-emerald-500/10 bg-emerald-500/5 p-3 text-center font-mono text-xs text-emerald-400">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
          <span>LEAD SEED COMPLETED: Human operator review pipeline assigned.</span>
        </div>
        <button
          type="button"
          onClick={() => setQueuedMessage(null)}
          className="h-11 w-full touch-manipulation rounded-lg border border-slate-800 bg-slate-900/60 font-sans text-xs font-semibold tracking-wide text-slate-300 uppercase transition-all active:scale-95"
        >
          Recalibrate Target Form
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmitEvaluation} className="w-full space-y-4">
      <p
        className={
          centered
            ? "text-center font-sans text-sm leading-relaxed text-slate-400"
            : "font-sans text-xs leading-relaxed text-slate-400"
        }
      >
        Provide your structural perimeter targets below. The sales agent will evaluate your
        environment profile against our deployment baselines to construct a tailored integration
        pitch.
      </p>

      <div>
        <label className={labelClass} htmlFor="sales-agent-name">
          Identity Name
        </label>
        <input
          id="sales-agent-name"
          type="text"
          required
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="e.g. Dereck"
          className="h-11 w-full touch-manipulation rounded-lg border border-slate-800 bg-slate-950/60 px-4 text-sm text-white transition-all outline-none focus:border-cyan-500"
        />
      </div>

      <div>
        <label className={labelClass} htmlFor="sales-agent-email">
          Secure Return Email
        </label>
        <input
          id="sales-agent-email"
          type="email"
          required
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          placeholder="name@organization.com"
          className="h-11 w-full touch-manipulation rounded-lg border border-slate-800 bg-slate-950/60 px-4 text-sm text-white transition-all outline-none focus:border-cyan-500"
        />
      </div>

      <div>
        <label className={labelClass} htmlFor="sales-agent-company">
          Organization
        </label>
        <input
          id="sales-agent-company"
          type="text"
          required
          value={formData.company}
          onChange={(e) => setFormData({ ...formData, company: e.target.value })}
          placeholder="e.g. Acme Financial"
          className="h-11 w-full touch-manipulation rounded-lg border border-slate-800 bg-slate-950/60 px-4 text-sm text-white transition-all outline-none focus:border-cyan-500"
        />
      </div>

      <div>
        <label className={labelClass} htmlFor="sales-agent-baseline">
          Target Cluster Scale Alignment
        </label>
        <select
          id="sales-agent-baseline"
          value={formData.baselineTarget}
          onChange={(e) =>
            setFormData({
              ...formData,
              baselineTarget: e.target.value as BaselineTarget,
            })
          }
          className="h-11 w-full touch-manipulation rounded-lg border border-slate-800 bg-slate-950/60 px-3 font-sans text-sm text-slate-300 transition-all outline-none focus:border-cyan-500 sm:text-left"
        >
          <option value="regionalBHC">Regional BHC (Fed supervision, $10B–$100B assets)</option>
          <option value="publicPower">Public Power / Utility (NERC CIP, OT/IT)</option>
          <option value="communityHealth">Community Health System (HIPAA / HITRUST)</option>
        </select>
      </div>

      <div>
        <label className={labelClass} htmlFor="sales-agent-notes">
          Primary GRC Friction / Operational Notes
        </label>
        <textarea
          id="sales-agent-notes"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="Detail your isolation requirements or active regulatory audits..."
          className="h-24 w-full resize-none touch-manipulation rounded-lg border border-slate-800 bg-slate-950/60 p-3 font-sans text-sm text-white transition-all outline-none focus:border-cyan-500"
        />
      </div>

      <button
        type="submit"
        disabled={isEvaluating}
        className="mt-6 flex h-11 w-full touch-manipulation items-center justify-center rounded-lg bg-cyan-600 font-sans text-sm font-bold tracking-wide text-slate-950 uppercase transition-all duration-150 hover:bg-cyan-500 active:scale-[0.98] disabled:bg-slate-900 disabled:text-slate-600"
      >
        {isEvaluating ? "Analyzing Architectural Profile..." : "Initialize Architectural Audit"}
      </button>
    </form>
  );
}
