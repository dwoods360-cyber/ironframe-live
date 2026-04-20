"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { triggerAttbotSimulation } from "@/app/actions/attbotActions";
import { purgeSimulation } from "@/app/actions/purgeSimulation";
import { appendAuditLog, clearAllAuditLogs } from "@/app/utils/auditLogger";
import { wakeBlueTeam, sleepBlueTeam } from "@/app/utils/blueTeamSync";
import { useAgentStore } from "@/app/store/agentStore";
import { useGrcBotStore } from "@/app/store/grcBotStore";
import { useKimbotStore } from "@/app/store/kimbotStore";
import { useRiskStore, type PipelineThreat } from "@/app/store/riskStore";
import IrontechChaosDeploy from "@/app/(dashboard)/opsupport/IrontechChaosDeploy";
import ControlRoom from "@/app/components/ControlRoom";

type Props = {
  /** `sidebar`: dashboard left column · `page`: OpSupport band (historical full-width chrome) */
  variant?: "sidebar" | "page";
};

/**
 * Irontech / simulation command center — TSX structure and Tailwind strings restored from git 5697029
 * (`StrategicIntel` Control Room block + `settings/config` KIMBOT/GRC panels). Logic uses hardened server
 * actions + global `useKimbotPersistLoop` (AppShell); store updates use server-returned CUIDs.
 */
export default function IrontechLeftPaneControls({ variant = "sidebar" }: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const upsertPipelineThreat = useRiskStore((s) => s.upsertPipelineThreat);
  const selectedIndustry = useRiskStore((s) => s.selectedIndustry);
  const selectedTenantName = useRiskStore((s) => s.selectedTenantName);
  const addStreamMessage = useAgentStore((s) => s.addStreamMessage);

  const isKimbotActive = useKimbotStore((s) => s.enabled);
  const kimbotIntensity = useKimbotStore((s) => s.intensity);
  const kimbotAttackType = useKimbotStore((s) => s.attackType);
  const setKimbotEnabled = useKimbotStore((s) => s.setEnabled);

  const grcBotCompanyCount = useGrcBotStore((s) => s.companyCount);
  const isGrcbotActive = useGrcBotStore((s) => s.enabled);
  const setGrcbotEnabled = useGrcBotStore((s) => s.setEnabled);

  const [attbotPending, setAttbotPending] = useState(false);

  const isPage = variant === "page";

  const toggleKimbot = () => {
    const next = !isKimbotActive;
    setKimbotEnabled(next);
    if (next) wakeBlueTeam();
    else sleepBlueTeam();
    appendAuditLog({
      action_type: next ? "RED_TEAM_SIMULATION_START" : "RED_TEAM_SIMULATION_STOP",
      log_type: "SIMULATION",
      description: next
        ? `KIMBOT Red Team simulation started. Attack: ${kimbotAttackType}, Intensity: ${kimbotIntensity}, Industry: ${selectedIndustry}.`
        : "KIMBOT Red Team simulation stopped.",
      metadata_tag: next
        ? `SIMULATION|KIMBOT|industry:${selectedIndustry}|attack:${kimbotAttackType}|intensity:${kimbotIntensity}${
            selectedTenantName ? `|tenant:${selectedTenantName}` : ""
          }`
        : "SIMULATION|KIMBOT|stop",
    });
  };

  const toggleGrcbot = () => {
    const next = !isGrcbotActive;
    setGrcbotEnabled(next);
    appendAuditLog({
      action_type: next ? "RED_TEAM_SIMULATION_START" : "RED_TEAM_SIMULATION_STOP",
      log_type: "SIMULATION",
      description: next
        ? `GRCBOT Operations Simulator started. Simulating ${grcBotCompanyCount} companies; vendor submits and acknowledge/process with ~15% SLA fail.`
        : "GRCBOT Operations Simulator stopped.",
      metadata_tag: next
        ? `SIMULATION|GRCBOT|start|companies:${grcBotCompanyCount}${
            selectedIndustry ? `|industry:${selectedIndustry}` : ""
          }${selectedTenantName ? `|tenant:${selectedTenantName}` : ""}`
        : "SIMULATION|GRCBOT|stop",
    });
  };

  async function handleAttbotTrigger() {
    setAttbotPending(true);
    try {
      const res = await triggerAttbotSimulation();
      if (!res.ok) {
        addStreamMessage(`> [ATTBOT] ${res.error}`);
        return;
      }
      upsertPipelineThreat(res.pipelineThreat as PipelineThreat);
      await useRiskStore.getState().pulseThreatBoardsFromDb();
    } finally {
      setAttbotPending(false);
    }
  }

  async function handleMasterPurge() {
    const result = await purgeSimulation();
    if (result.ok) {
      clearAllAuditLogs();
      useKimbotStore.getState().resetSimulationCounters();
      useGrcBotStore.getState().stop();
      useRiskStore.getState().clearAllRiskStateForPurge();
      useRiskStore.getState().setSelectedThreatId(null);
      addStreamMessage("> [SYSTEM] Simulation environment wiped. System status: CLEAN.");
      sleepBlueTeam();
      startTransition(() => {
        router.refresh();
      });
    }
  }

  const stack = (
    <>
      {/* git 5697029:app/components/StrategicIntel.tsx — Control Room (verbatim class strings) */}
      <section className="border-b border-zinc-900 bg-[#050509] p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[11px] font-black uppercase tracking-widest text-zinc-300">CONTROL ROOM</h2>
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
        </div>
        <div className="mb-4 flex justify-between text-[9px] font-black uppercase tracking-widest text-zinc-500">
          <Link href="/" className="transition-colors hover:text-emerald-500">
            Dashboard
          </Link>
          <Link href="/reports/ops" className="transition-colors hover:text-emerald-500">
            Reports
          </Link>
          <Link href="/integrity" className="transition-colors hover:text-emerald-500">
            Audit Trail
          </Link>
          <Link href="/settings" className="transition-colors hover:text-emerald-500">
            Settings
          </Link>
        </div>

        <p className="mb-2 text-[8px] font-black uppercase tracking-widest text-rose-500/90">Simulation · Adversary</p>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={toggleKimbot}
            className={`rounded-sm border py-1.5 text-[9px] font-black uppercase tracking-widest transition-colors ${
              isKimbotActive
                ? "border-rose-500/60 bg-rose-950/40 text-rose-200 shadow-[0_0_12px_rgba(244,63,94,0.2)]"
                : "border-zinc-800 bg-zinc-950 text-zinc-500 hover:border-zinc-600"
            }`}
            title="Kimbot: simulated red-team injector (not production Ironbloom)"
          >
            KIMBOT (RED TEAM) {isKimbotActive ? "ON" : "OFF"}
          </button>
          <button
            type="button"
            onClick={toggleGrcbot}
            className={`rounded-sm border py-1.5 text-[9px] font-black uppercase tracking-widest transition-colors ${
              isGrcbotActive
                ? "border-sky-500/50 bg-sky-950/30 text-sky-200"
                : "border-zinc-800 bg-zinc-950 text-zinc-500 hover:border-zinc-600"
            }`}
            title="GRCBOT: simulated multi-tenant load (test)"
          >
            GRCBOT {isGrcbotActive ? "ON" : "OFF"}
          </button>
          <form
            className="min-w-0"
            onSubmit={(e) => {
              e.preventDefault();
              void handleAttbotTrigger();
            }}
          >
            <button
              type="submit"
              disabled={attbotPending}
              className="min-w-0 w-full rounded-sm border border-amber-900/40 bg-amber-950/20 py-1.5 text-[9px] font-black uppercase tracking-widest text-amber-300 transition-colors hover:bg-amber-900/30 disabled:opacity-50"
            >
              {attbotPending ? "ATTBOT…" : "ATTBOT"}
            </button>
          </form>
          <button
            type="button"
            onClick={() => void handleMasterPurge()}
            className="min-w-0 w-full self-start rounded-sm border border-red-900/50 bg-red-950/30 py-1.5 text-[9px] font-black uppercase tracking-widest text-red-500 transition-colors hover:bg-red-900/50 hover:text-red-400"
          >
            MASTER PURGE
          </button>
        </div>

        <div className="mt-3 w-full min-w-0 max-w-full">
          <ControlRoom>
            <IrontechChaosDeploy embedded />
          </ControlRoom>
        </div>
      </section>
    </>
  );

  if (isPage) {
    return (
      <section className="border-b border-zinc-800/90 bg-gradient-to-r from-zinc-950 via-[#0a0a12] to-zinc-950 px-4 py-4">
        <div className="mx-auto max-w-[1600px] space-y-0">{stack}</div>
      </section>
    );
  }

  return <div className="bg-[#050509]">{stack}</div>;
}
