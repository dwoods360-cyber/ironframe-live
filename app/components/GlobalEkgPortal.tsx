"use client";

import { useEffect, useRef, useState } from "react";
import { useTenantContext } from "@/app/context/TenantProvider";
import { getTripanePanelReadiness } from "@/app/hooks/useContextSwitchPaintGate";
import { useRiskStore } from "@/app/store/riskStore";

const EXIT_FADE_MS = 1500;
/** Consecutive rAF ticks required before fade — avoids one-frame stale DOM false positives. */
const HYDRATION_STABLE_FRAMES = 4;

const MATURITY_CHIP_TEST_IDS = [
  "grc-maturity-system",
  "grc-maturity-attestation",
  "grc-maturity-chaos",
  "grc-maturity-directivity",
] as const;

type HydrationBaseline = {
  tenantAtSwitch: string;
  maturityStrip: string | null;
};

function readMaturityStripFingerprint(): string | null {
  const parts: string[] = [];

  for (const testId of MATURITY_CHIP_TEST_IDS) {
    const chip = document.querySelector(`[data-testid="${testId}"]`);
    if (!(chip instanceof HTMLElement)) {
      return null;
    }
    const text = chip.textContent?.trim() ?? "";
    if (!text || /pending integrity/i.test(text)) {
      return null;
    }
    parts.push(text);
  }

  return parts.join("|");
}

function isCenterCanvasPopulated(): boolean {
  const centerMain = document.querySelector('[data-testid="dashboard-main"]');
  if (!(centerMain instanceof HTMLElement)) {
    return false;
  }
  if (centerMain.getAttribute("aria-busy") === "true") {
    return false;
  }

  const tracker = document.querySelector('[data-testid="operational-maturity-tracker-section"]');
  return tracker instanceof HTMLElement;
}

/**
 * Layout hydration is complete only when the store switch flag has cleared AND tripane
 * modules have painted with metrics that differ from the pre-switch baseline.
 */
function isLayoutHydrationComplete(
  baseline: HydrationBaseline,
  currentTenant: string,
  isContextSwitching: boolean,
): boolean {
  if (isContextSwitching) {
    return false;
  }

  const readiness = getTripanePanelReadiness();
  if (
    !readiness.isLeftPanelReady ||
    !readiness.isCenterCanvasReady ||
    !readiness.isAuditLedgerReady ||
    !readiness.isMaturityReady
  ) {
    return false;
  }

  if (!isCenterCanvasPopulated()) {
    return false;
  }

  const stripFingerprint = readMaturityStripFingerprint();
  if (!stripFingerprint) {
    return false;
  }

  const metricsRepainted =
    stripFingerprint !== baseline.maturityStrip ||
    currentTenant !== baseline.tenantAtSwitch;

  return metricsRepainted;
}

/** Root-level TENANT-001 overlay — GPU pulse runs until tripane layout hydration is verified. */
export default function GlobalEkgPortal() {
  const isContextSwitching = useRiskStore((state) => state.isContextSwitching);
  const selectedTenantName = useRiskStore((state) => state.selectedTenantName);
  const { activeTenantKey, activeTenantUuid } = useTenantContext();
  const currentTenantString =
    activeTenantKey || activeTenantUuid || selectedTenantName || "default";

  const [shouldRender, setShouldRender] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const baselineRef = useRef<HydrationBaseline | null>(null);
  const fadeTimerRef = useRef<number | undefined>(undefined);
  const stableFramesRef = useRef(0);
  const prevSwitchingRef = useRef(false);

  useEffect(() => {
    const switchJustStarted = isContextSwitching && !prevSwitchingRef.current;
    prevSwitchingRef.current = isContextSwitching;

    if (!switchJustStarted) {
      return;
    }

    if (fadeTimerRef.current !== undefined) {
      window.clearTimeout(fadeTimerRef.current);
      fadeTimerRef.current = undefined;
    }

    baselineRef.current = {
      tenantAtSwitch: currentTenantString,
      maturityStrip: readMaturityStripFingerprint(),
    };
    stableFramesRef.current = 0;
    setIsFadingOut(false);
    setShouldRender(true);
  }, [isContextSwitching, currentTenantString]);

  useEffect(() => {
    if (!shouldRender || isFadingOut || !baselineRef.current) {
      return;
    }

    let cancelled = false;
    let rafId = 0;

    const tick = () => {
      if (cancelled || !baselineRef.current) {
        return;
      }

      if (
        isLayoutHydrationComplete(
          baselineRef.current,
          currentTenantString,
          isContextSwitching,
        )
      ) {
        stableFramesRef.current += 1;
      } else {
        stableFramesRef.current = 0;
      }

      if (stableFramesRef.current >= HYDRATION_STABLE_FRAMES) {
        stableFramesRef.current = 0;
        setIsFadingOut(true);
        fadeTimerRef.current = window.setTimeout(() => {
          setShouldRender(false);
          setIsFadingOut(false);
          baselineRef.current = null;
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
  }, [shouldRender, isFadingOut, isContextSwitching, currentTenantString]);

  useEffect(
    () => () => {
      if (fadeTimerRef.current !== undefined) {
        window.clearTimeout(fadeTimerRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    const onForceComplete = () => {
      if (!shouldRender || isFadingOut) {
        return;
      }
      stableFramesRef.current = HYDRATION_STABLE_FRAMES;
      setIsFadingOut(true);
      fadeTimerRef.current = window.setTimeout(() => {
        setShouldRender(false);
        setIsFadingOut(false);
        baselineRef.current = null;
        fadeTimerRef.current = undefined;
      }, EXIT_FADE_MS);
    };

    window.addEventListener("ironframe:ekg-force-complete", onForceComplete);
    return () => window.removeEventListener("ironframe:ekg-force-complete", onForceComplete);
  }, [shouldRender, isFadingOut]);

  if (!shouldRender) {
    return null;
  }

  return (
    <div
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
