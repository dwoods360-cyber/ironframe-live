"use client";

import { useEffect, useState } from "react";
import { fetchLiveEsgTelemetry, type LiveEsgTelemetryRow } from "@/app/actions/esgActions";

function formatCarbonKg(carbonEquivalent: string): string {
  return `${(Number(carbonEquivalent) / 1000).toFixed(2)} kg CO2e`;
}

function toDisplayOperator(operator: string): string {
  if (operator.trim().toUpperCase() === "SYSTEM_IRONBLOOM_AUTO") {
    return "Ironbloom (autonomous)";
  }
  return operator;
}

export default function PhysicalTelemetry() {
  const [metrics, setMetrics] = useState<LiveEsgTelemetryRow[]>([]);

  useEffect(() => {
    let cancelled = false;

    const poll = () => {
      void fetchLiveEsgTelemetry()
        .then((freshRows) => {
          if (cancelled) return;
          setMetrics((prev) => (freshRows[0]?.id !== prev[0]?.id ? freshRows : prev));
        })
        .catch(() => {
          // Keep last known snapshot when polling fails.
        });
    };

    poll();
    const intervalId = window.setInterval(poll, 3000);
    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, []);

  return (
    <section className="flex h-[240px] flex-col border-t border-emerald-800/40 bg-emerald-950/20 p-3 font-mono text-emerald-100">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-emerald-300">
          Physical Telemetry
        </h3>
        <span className="rounded border border-emerald-600/60 bg-emerald-950/40 px-2 py-0.5 text-[8px] font-bold uppercase text-emerald-300">
          ESG
        </span>
      </div>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto custom-scrollbar">
        {metrics.length === 0 ? (
          <p className="text-[10px] italic text-emerald-200/60">
            System quiet. No terminal receipts in the telemetry stream.
          </p>
        ) : (
          metrics.map((metric) => (
            <article
              key={metric.id}
              className="rounded border border-emerald-900/60 bg-black/25 px-2 py-1.5"
            >
              <div className="flex items-center justify-between">
                <p className="text-[9px] font-semibold text-emerald-100">
                  {toDisplayOperator(metric.auditLog.operator)}
                </p>
                <p className="text-[8px] text-emerald-300/80">
                  {new Date(metric.createdAt).toLocaleTimeString()}
                </p>
              </div>
              <p className="mt-0.5 text-[10px] text-emerald-200">
                {metric.unit} {metric.quantity} | {formatCarbonKg(metric.carbonEquivalent)}
              </p>
            </article>
          ))
        )}
      </div>
    </section>
  );
}

