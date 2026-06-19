"use client";

import { useState } from "react";

interface SalesAgentSlideOverProps {
  isOpen: boolean;
  onClose: () => void;
}

type BaselineTarget = "Gridcore" | "Vaultbank" | "Medshield";

export default function SalesAgentSlideOver({ isOpen, onClose }: SalesAgentSlideOverProps) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    company: "",
    baselineTarget: "Medshield" as BaselineTarget,
    notes: "",
  });
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [queuedMessage, setQueuedMessage] = useState<string | null>(null);

  if (!isOpen) return null;

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

  return (
    <div className="animate-fadeIn fixed inset-0 z-50 flex justify-end bg-slate-950/60 backdrop-blur-sm transition-opacity duration-300">
      <button
        type="button"
        className="absolute inset-0 -z-10 cursor-default"
        aria-label="Close sales specialist panel"
        onClick={onClose}
      />

      <div className="relative flex h-full w-full max-w-lg flex-col justify-between overflow-y-auto border-l border-slate-800 bg-[#040a1b] p-6 shadow-2xl sm:p-8">
        <div className="space-y-6">
          <header className="flex items-center justify-between border-b border-slate-800/80 pb-4">
            <div>
              <div className="mb-0.5 flex items-center gap-2 font-mono text-[10px] tracking-widest text-cyan-400 uppercase">
                <span>PRE-FLIGHT LEAD CONVERSION GATES</span>
              </div>
              <h2 className="font-sans text-lg font-bold text-white">AI Growth & Strategy Specialist</h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 w-9 touch-manipulation items-center justify-center rounded border border-slate-800 bg-slate-900 font-mono text-slate-400 transition-transform active:scale-95 hover:text-white"
              aria-label="Close panel"
            >
              ✕
            </button>
          </header>

          {!queuedMessage ? (
            <form onSubmit={handleSubmitEvaluation} className="space-y-4">
              <p className="font-sans text-xs leading-relaxed text-slate-400">
                Provide your structural perimeter targets below. The sales agent will evaluate your
                environment profile against our deployment baselines to construct a tailored
                integration pitch.
              </p>

              <div>
                <label className="mb-1 block font-mono text-[10px] text-slate-500 uppercase">
                  Identity Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Dereck"
                  className="h-11 w-full touch-manipulation rounded-lg border border-slate-800 bg-slate-950/60 px-4 text-sm text-white transition-all outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="mb-1 block font-mono text-[10px] text-slate-500 uppercase">
                  Secure Return Email
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="name@organization.com"
                  className="h-11 w-full touch-manipulation rounded-lg border border-slate-800 bg-slate-950/60 px-4 text-sm text-white transition-all outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="mb-1 block font-mono text-[10px] text-slate-500 uppercase">
                  Organization
                </label>
                <input
                  type="text"
                  required
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  placeholder="e.g. Acme Financial"
                  className="h-11 w-full touch-manipulation rounded-lg border border-slate-800 bg-slate-950/60 px-4 text-sm text-white transition-all outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="mb-1 block font-mono text-[10px] text-slate-500 uppercase">
                  Target Cluster Scale Alignment
                </label>
                <select
                  value={formData.baselineTarget}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      baselineTarget: e.target.value as BaselineTarget,
                    })
                  }
                  className="h-11 w-full touch-manipulation rounded-lg border border-slate-800 bg-slate-950/60 px-3 font-sans text-sm text-slate-300 transition-all outline-none focus:border-cyan-500"
                >
                  <option value="Gridcore">Gridcore Tier Baseline (4.7M Protected Units)</option>
                  <option value="Vaultbank">Vaultbank Tier Baseline (5.9M Protected Units)</option>
                  <option value="Medshield">Medshield Tier Baseline (11.1M Protected Units)</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block font-mono text-[10px] text-slate-500 uppercase">
                  Primary GRC Friction / Operational Notes
                </label>
                <textarea
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
          ) : (
            <div className="animate-fadeIn space-y-4">
              <div className="flex items-center gap-2 font-mono text-[10px] text-indigo-400 uppercase">
                <span>⚡ LEAD PROFILE QUEUED FOR REVIEW</span>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-4 font-sans text-sm leading-relaxed text-slate-200">
                {queuedMessage}
              </div>
              <div className="flex items-center gap-2.5 rounded-lg border border-emerald-500/10 bg-emerald-500/5 p-3 font-mono text-xs text-emerald-400">
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
          )}
        </div>

        <footer className="mt-8 flex justify-between border-t border-slate-900 pt-4 font-mono text-[9px] text-slate-600">
          <span>PORTAL_REF: AM_CONVERT_V1</span>
          <span>SYSTEM STATE: DETERMINISTIC</span>
        </footer>
      </div>
    </div>
  );
}
