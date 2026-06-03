"use client";

import { useEffect, useState } from "react";
import { useTenantContext } from "@/app/context/TenantProvider";
import { useRiskStore } from "@/app/store/riskStore";

/** Root-level TENANT-001 sync overlay — GPU-composited background pulse (no SVG/transform churn). */
export default function GlobalEkgPortal() {
  const isContextSwitching = useRiskStore((state) => state.isContextSwitching);
  const selectedTenantName = useRiskStore((state) => state.selectedTenantName);
  const { activeTenantKey, activeTenantUuid } = useTenantContext();
  const [shouldRender, setShouldRender] = useState(false);

  const currentTenantString =
    activeTenantKey || activeTenantUuid || selectedTenantName || "default";

  useEffect(() => {
    if (isContextSwitching) {
      setShouldRender(true);
      return;
    }

    const timer = window.setTimeout(() => setShouldRender(false), 400);
    return () => window.clearTimeout(timer);
  }, [isContextSwitching]);

  if (!shouldRender) {
    return null;
  }

  return (
    <div
      key={`global-ekg-portal-${currentTenantString}`}
      className="global-ekg-portal-shell pointer-events-none fixed inset-x-0 top-16 flex h-4 items-center overflow-hidden border-b border-emerald-500/10 bg-slate-950/60 backdrop-blur-[1px]"
      style={{ zIndex: 99999 }}
      data-testid="global-ekg-progress-viewport"
      role="progressbar"
      aria-label="Tenant cryptographic handshake in progress"
      aria-busy={isContextSwitching}
    >
      <div className="global-ekg-pulse-layer" aria-hidden />

      <div className="absolute left-6 flex select-none items-center gap-2 font-mono text-[9px] font-black uppercase tracking-widest text-emerald-400">
        <span className="h-1.5 w-1.5 animate-ping rounded-full bg-emerald-400" aria-hidden />
        [ RUNNING SECURE CRYPTO HANDSHAKE CLIENT SYNC... ]
      </div>
    </div>
  );
}
