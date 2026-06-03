"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

import ContextualHelpTrigger from "@/app/components/HelpSystem/ContextualHelpTrigger";
import { useTenantContext } from "@/app/context/TenantProvider";
import { useSystemConfigStore } from "@/app/store/systemConfigStore";



/** Central handshake strip — aligned with GRC Gold living audit / War Room status. */

export type SyncHandshakePhase = "idle" | "syncing" | "verified" | "drift";



const COMMON_BASE =

  "w-full rounded-md border px-3 py-2 text-center font-mono text-[9px] font-bold uppercase tracking-wide transition";



/**

 * Canonical idle line — client-only after mount (see `isMounted` guard).

 */

export const HANDSHAKE_SYSTEM_READY_LINE =

  "[ 🔗 SYSTEM READY: AWAITING COMMAND CENTER TARGETING ]";



/** Shown after tenant context switches — emerald completion beat. */

export const TENANT_SYNC_COMPLETE_LINE = "[ ✅ SYNC COMPLETE ]";



const IDLE_APPEARANCE_CLASS = `${COMMON_BASE} border-cyan-800/40 bg-slate-950/80 text-cyan-500/70`;



type Props = {

  phase: SyncHandshakePhase;

};



function ShadowPlaneBanner({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <div
      className={`${COMMON_BASE} mb-1.5 animate-pulse border-amber-500/55 bg-gradient-to-r from-amber-950/95 via-cyan-950/40 to-amber-950/90 text-amber-50 shadow-[0_0_18px_rgba(34,211,238,0.22)]`}
      role="status"
      aria-live="polite"
    >
      [ ⚠️ SHADOW PLANE ACTIVE — SIMULATION MODE ]
    </div>
  );
}

function SyncHelpTrigger() {
  return (
    <ContextualHelpTrigger
      featureId="sync-001"
      title="Platform Integrity Synchronizer"
      location="Pinned inside the top grid box of your center canvas column layout."
      purpose="Gives immediate visual confirmation that all security grids and multi-tenant perimeters are operating perfectly with zero architectural drift."
      steps={[
        "Look at the sync bar at the top of the center panel.",
        "Confirm that the status indicator stays bright teal, showing that all underlying engines are fully aligned.",
      ]}
    />
  );
}

function SyncBarShell({
  isSimulationMode,
  statusBar,
}: {
  isSimulationMode: boolean;
  statusBar: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-0">
      <ShadowPlaneBanner visible={isSimulationMode} />
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">{statusBar}</div>
        <SyncHelpTrigger />
      </div>
    </div>
  );
}

export default function HandshakeStatusBar({ phase }: Props) {

  const [isMounted, setIsMounted] = useState(false);

  const { activeTenantUuid } = useTenantContext();
  const { isSimulationMode } = useSystemConfigStore();

  /** `pulse` = amber bridge; `verified` = short emerald beat after tenant change. */

  const [tenantBeat, setTenantBeat] = useState<"idle" | "pulse" | "verified">("idle");

  const prevTenantUuidRef = useRef<string | null | undefined>(undefined);

  const tenantTimerRefs = useRef<number[]>([]);



  useEffect(() => {

    setIsMounted(true);

  }, []);



  useEffect(() => {

    if (!isMounted) return;



    tenantTimerRefs.current.forEach((id) => clearTimeout(id));

    tenantTimerRefs.current = [];



    const uuid = activeTenantUuid;

    if (prevTenantUuidRef.current === undefined) {

      prevTenantUuidRef.current = uuid;

      return;

    }

    if (prevTenantUuidRef.current === uuid) {

      return;

    }

    prevTenantUuidRef.current = uuid;



    setTenantBeat("pulse");

    const t1 = window.setTimeout(() => {

      setTenantBeat("verified");

    }, 750);

    const t2 = window.setTimeout(() => {

      setTenantBeat("idle");

    }, 2800);

    tenantTimerRefs.current = [t1, t2];



    return () => {

      clearTimeout(t1);

      clearTimeout(t2);

    };

  }, [isMounted, activeTenantUuid]);



  /** Pre-mount: no copy — avoids SSR/client string drift during hydration. */

  if (!isMounted) {
    return (
      <SyncBarShell
        isSimulationMode={isSimulationMode}
        statusBar={
          <div
            className={`${IDLE_APPEARANCE_CLASS} min-h-[2.25rem]`}
            role="presentation"
            aria-hidden
            suppressHydrationWarning
          />
        }
      />
    );
  }

  if (phase === "drift") {
    return (
      <SyncBarShell
        isSimulationMode={isSimulationMode}
        statusBar={
          <div
            className={`${COMMON_BASE} animate-pulse border-red-600/60 bg-red-950/45 text-red-200 shadow-[inset_0_0_0_1px_rgba(248,113,113,0.35)]`}
            role="alert"
            aria-live="assertive"
          >
            [ ⚠️ DRIFT DETECTED: AUDIT INTEGRITY AT RISK - RE-AUTHORIZE NOW ]
          </div>
        }
      />
    );
  }



  const tenantPulseActive = tenantBeat === "pulse";

  const tenantVerifiedActive = tenantBeat === "verified";



  if (tenantPulseActive) {
    return (
      <SyncBarShell
        isSimulationMode={isSimulationMode}
        statusBar={
          <div
            className={`${COMMON_BASE} animate-pulse border-amber-600/55 bg-amber-950/45 text-amber-200 shadow-[inset_0_0_0_1px_rgba(245,158,11,0.28)]`}
            role="status"
            aria-live="polite"
          >
            [ 🛡️ SYNC IN PROGRESS: REALIGNING FORENSIC PRIORITY... ]
          </div>
        }
      />
    );
  }

  if (tenantVerifiedActive) {
    return (
      <SyncBarShell
        isSimulationMode={isSimulationMode}
        statusBar={
          <div
            className={`${COMMON_BASE} border-emerald-500/60 bg-emerald-950/40 text-emerald-100 shadow-[0_0_22px_rgba(16,185,129,0.42)]`}
            role="status"
          >
            {TENANT_SYNC_COMPLETE_LINE}
          </div>
        }
      />
    );
  }

  if (phase === "syncing") {
    return (
      <SyncBarShell
        isSimulationMode={isSimulationMode}
        statusBar={
          <div
            className={`${COMMON_BASE} animate-pulse border-amber-600/55 bg-amber-950/45 text-amber-200 shadow-[inset_0_0_0_1px_rgba(245,158,11,0.28)]`}
            role="status"
            aria-live="polite"
          >
            [ 🛡️ SYNC IN PROGRESS: REALIGNING FORENSIC PRIORITY... ]
          </div>
        }
      />
    );
  }

  if (phase === "verified") {
    return (
      <SyncBarShell
        isSimulationMode={isSimulationMode}
        statusBar={
          <div
            className={`${COMMON_BASE} border-emerald-500/60 bg-emerald-950/40 text-emerald-100 shadow-[0_0_22px_rgba(16,185,129,0.42)]`}
            role="status"
          >
            [ ✅ SYNC COMPLETE: FINANCIALS & FORENSICS ALIGNED ]
          </div>
        }
      />
    );
  }

  return (
    <SyncBarShell
      isSimulationMode={isSimulationMode}
      statusBar={
        <div className={IDLE_APPEARANCE_CLASS} role="status">
          {HANDSHAKE_SYSTEM_READY_LINE}
        </div>
      }
    />
  );
}

