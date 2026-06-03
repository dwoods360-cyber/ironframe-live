"use client";

import { useEffect, useRef, useState } from "react";
import { useTenantContext } from "@/app/context/TenantProvider";
import { useRiskStore } from "@/app/store/riskStore";

const MIN_EKG_SESSION_MS = 8000;
const EXIT_FADE_MS = 1200;

function clearEkgTimers(timers: { session?: ReturnType<typeof setTimeout>; fade?: ReturnType<typeof setTimeout> }) {
  if (timers.session !== undefined) {
    window.clearTimeout(timers.session);
    timers.session = undefined;
  }
  if (timers.fade !== undefined) {
    window.clearTimeout(timers.fade);
    timers.fade = undefined;
  }
}

/** Root-level TENANT-001 sync overlay — GPU-composited pulse locked to the 8s paint lifecycle. */
export default function GlobalEkgPortal() {
  const isContextSwitching = useRiskStore((state) => state.isContextSwitching);
  const selectedTenantName = useRiskStore((state) => state.selectedTenantName);
  const { activeTenantKey, activeTenantUuid } = useTenantContext();
  const currentTenantString =
    activeTenantKey || activeTenantUuid || selectedTenantName || "default";

  const [shouldRender, setShouldRender] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const timersRef = useRef<{ session?: ReturnType<typeof setTimeout>; fade?: ReturnType<typeof setTimeout> }>({});

  useEffect(() => {
    if (!isContextSwitching) {
      return;
    }

    clearEkgTimers(timersRef.current);
    setIsFadingOut(false);
    setShouldRender(true);

    timersRef.current.session = window.setTimeout(() => {
      setIsFadingOut(true);
      timersRef.current.fade = window.setTimeout(() => {
        setShouldRender(false);
        setIsFadingOut(false);
      }, EXIT_FADE_MS);
    }, MIN_EKG_SESSION_MS);
  }, [isContextSwitching, currentTenantString]);

  useEffect(() => () => clearEkgTimers(timersRef.current), []);

  if (!shouldRender) {
    return null;
  }

  return (
    <div
      key={`global-ekg-portal-${currentTenantString}`}
      className={`pointer-events-none fixed inset-x-0 top-16 flex h-4 items-center overflow-hidden border-b border-emerald-500/10 bg-slate-950/60 backdrop-blur-[1px] transition-opacity duration-1000 ${
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
