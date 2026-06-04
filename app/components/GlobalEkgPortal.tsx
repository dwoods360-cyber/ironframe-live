"use client";

import { useEffect, useRef, useState } from "react";
import { useTenantContext } from "@/app/context/TenantProvider";
import {
  areTripanePanelsPainted,
  getTripanePanelReadiness,
  readGovernanceMaturityFingerprint,
} from "@/app/hooks/useContextSwitchPaintGate";
import { useRiskStore } from "@/app/store/riskStore";

const EXIT_FADE_MS = 1500;

function isHydrationResolved(
  switchStartMaturity: string | null,
  isContextSwitching: boolean,
): boolean {
  const readiness = getTripanePanelReadiness();
  const panelsReady =
    readiness.isLeftPanelReady &&
    readiness.isCenterCanvasReady &&
    readiness.isAuditLedgerReady;

  if (!panelsReady || !readiness.isMaturityReady) {
    return false;
  }

  const maturityFingerprint = readGovernanceMaturityFingerprint();
  if (!maturityFingerprint) {
    return false;
  }

  const maturityChanged =
    switchStartMaturity !== null && maturityFingerprint !== switchStartMaturity;

  return maturityChanged || (!isContextSwitching && areTripanePanelsPainted());
}

/** Root-level TENANT-001 sync overlay — GPU pulse bound to tripane hydration, not wall-clock timers. */
export default function GlobalEkgPortal() {
  const isContextSwitching = useRiskStore((state) => state.isContextSwitching);
  const selectedTenantName = useRiskStore((state) => state.selectedTenantName);
  const { activeTenantKey, activeTenantUuid } = useTenantContext();
  const currentTenantString =
    activeTenantKey || activeTenantUuid || selectedTenantName || "default";

  const [shouldRender, setShouldRender] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const switchStartMaturityRef = useRef<string | null>(null);
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!isContextSwitching) {
      return;
    }

    if (fadeTimerRef.current !== undefined) {
      window.clearTimeout(fadeTimerRef.current);
      fadeTimerRef.current = undefined;
    }

    switchStartMaturityRef.current = readGovernanceMaturityFingerprint();
    setIsFadingOut(false);
    setShouldRender(true);
  }, [isContextSwitching, currentTenantString]);

  useEffect(() => {
    if (!shouldRender || isFadingOut) {
      return;
    }

    let cancelled = false;
    let rafId = 0;

    const tick = () => {
      if (cancelled) {
        return;
      }

      if (isHydrationResolved(switchStartMaturityRef.current, isContextSwitching)) {
        setIsFadingOut(true);
        fadeTimerRef.current = window.setTimeout(() => {
          setShouldRender(false);
          setIsFadingOut(false);
          switchStartMaturityRef.current = null;
          fadeTimerRef.current = undefined;
        }, EXIT_FADE_MS);
        return;
      }

      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(rafId);
    };
  }, [shouldRender, isFadingOut, isContextSwitching]);

  useEffect(
    () => () => {
      if (fadeTimerRef.current !== undefined) {
        window.clearTimeout(fadeTimerRef.current);
      }
    },
    [],
  );

  if (!shouldRender) {
    return null;
  }

  return (
    <div
      key={`global-ekg-portal-${currentTenantString}`}
      className={`pointer-events-none fixed inset-x-0 top-16 flex h-4 items-center overflow-hidden border-b border-emerald-500/10 bg-slate-950/60 backdrop-blur-[1px] transition-opacity duration-[1500ms] ${
        isFadingOut ? "opacity-0" : "opacity-100"
      }`}
      style={{ zIndex: 99999 }}
      data-testid="global-ekg-progress-viewport"
      role="progressbar"
      aria-label="Tenant cryptographic handshake in progress"
      aria-busy={!isFadingOut}
    >
      <div
        className="global-ekg-pulse-layer absolute inset-0 h-full w-full"
        style={{
          willChange: "background-position",
          transform: "translateZ(0)",
        }}
        aria-hidden
      />
      <div className="absolute left-6 flex select-none items-center gap-2 font-mono text-[9px] font-black uppercase tracking-widest text-emerald-400">
        <span className="h-1.5 w-1.5 animate-ping rounded-full bg-emerald-400" aria-hidden />
        [ RUNNING SECURE CRYPTO HANDSHAKE CLIENT SYNC... ]
      </div>
    </div>
  );
}
