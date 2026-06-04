"use client";

import { useEffect } from "react";
import { useRiskStore } from "@/app/store/riskStore";

type ContextSwitchPaintGateOptions = {
  loading: boolean;
  hasData: boolean;
  onPanelsPainted?: () => void;
};

export function getTripanePanelReadiness(): {
  isLeftPanelReady: boolean;
  isCenterCanvasReady: boolean;
  isAuditLedgerReady: boolean;
  isMaturityReady: boolean;
} {
  const leftPanel = document.querySelector(
    '[data-testid="dashboard-left-panel"]:not([aria-hidden="true"])',
  );
  const centerPanel = document.querySelector('[data-testid="dashboard-main"]:not([aria-busy="true"])');
  const maturityChip = document.querySelector('[data-testid="grc-maturity-system"]');
  const maturityReady =
    maturityChip instanceof HTMLElement && !/pending integrity/i.test(maturityChip.textContent ?? "");
  const auditStream = document.querySelector('[data-testid="audit-ledger-stream"]');

  return {
    isLeftPanelReady: Boolean(leftPanel),
    isCenterCanvasReady: Boolean(centerPanel),
    isAuditLedgerReady: Boolean(auditStream),
    isMaturityReady: maturityReady,
  };
}

export function areTripanePanelsPainted(): boolean {
  const readiness = getTripanePanelReadiness();
  return (
    readiness.isLeftPanelReady &&
    readiness.isCenterCanvasReady &&
    readiness.isAuditLedgerReady &&
    readiness.isMaturityReady
  );
}

/** Resolved maturity chip text once ingress recalc has painted (null while pending). */
export function readGovernanceMaturityFingerprint(): string | null {
  const maturityChip = document.querySelector('[data-testid="grc-maturity-system"]');
  if (!(maturityChip instanceof HTMLElement)) {
    return null;
  }
  const text = maturityChip.textContent?.trim() ?? "";
  if (!text || /pending integrity/i.test(text)) {
    return null;
  }
  return text;
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
