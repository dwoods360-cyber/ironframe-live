"use client";

import { useEffect } from "react";
import { useRiskStore } from "@/app/store/riskStore";

type ContextSwitchPaintGateOptions = {
  loading: boolean;
  hasData: boolean;
  onPanelsPainted?: () => void;
};

export function areTripanePanelsPainted(): boolean {
  const leftPanel = document.querySelector(
    '[data-testid="dashboard-left-panel"]:not([aria-hidden="true"])',
  );
  const centerPanel = document.querySelector('[data-testid="dashboard-main"]:not([aria-busy="true"])');
  const maturityChip = document.querySelector('[data-testid="grc-maturity-system"]');
  const maturityReady =
    maturityChip instanceof HTMLElement && !/pending integrity/i.test(maturityChip.textContent ?? "");
  const auditStream = document.querySelector('[data-testid="audit-ledger-stream"]');

  return Boolean(leftPanel && centerPanel && maturityReady && auditStream);
}

/** Clears TENANT-001 switching state once tripane panels finish painting (no fixed timeout). */
export function useContextSwitchPaintGate({
  loading,
  hasData,
  onPanelsPainted,
}: ContextSwitchPaintGateOptions) {
  const isContextSwitching = useRiskStore((s) => s.isContextSwitching);
  const setContextSwitching = useRiskStore((s) => s.setContextSwitching);

  useEffect(() => {
    if (!isContextSwitching) {
      return;
    }

    let cancelled = false;
    let rafId = 0;

    const tick = () => {
      if (cancelled) {
        return;
      }

      if (!loading && hasData && areTripanePanelsPainted()) {
        onPanelsPainted?.();
        setContextSwitching(false);
        return;
      }

      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(rafId);
    };
  }, [isContextSwitching, loading, hasData, onPanelsPainted, setContextSwitching]);
}
