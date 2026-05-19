import { CORE_WORKFORCE_AGENTS } from "@/app/config/agents";
import type { AgentRiskLevel, AgentRiskPulse } from "@/app/store/agentRiskStore";

export type IronwatchLayoutSignalResponse = {
  ok?: boolean;
  ironlockGlobalStateFreezeActive?: boolean;
  quarantineHardBanActive?: boolean;
};

export function mapHealthScoreToRiskLevel(score: number): AgentRiskLevel {
  if (score >= 72) return "low";
  if (score >= 40) return "medium";
  return "high";
}

/**
 * Deterministic per-agent health (0–100) from Ironwatch tick — oscillates slowly for demo pulse UX.
 */
export function computeIronwatchAgentHealthTable(tickMs: number): Record<number, AgentRiskPulse> {
  const out: Record<number, AgentRiskPulse> = {};
  for (const a of CORE_WORKFORCE_AGENTS) {
    const wave = 0.5 + 0.5 * Math.sin((tickMs / 9000) * Math.PI * 2 + a.index * 0.61);
    const healthScore = Math.max(5, Math.min(99, Math.round(18 + wave * 78)));
    out[a.index] = {
      healthScore,
      riskLevel: mapHealthScoreToRiskLevel(healthScore),
    };
  }
  return out;
}

/**
 * Gavel: Ironlock global state freeze — all agents render static high-risk (red) regardless of prior scores.
 */
export function applyIronlockStaticRedFreeze(
  byIndex: Record<number, AgentRiskPulse>,
  ironlockGlobalFreeze: boolean,
): Record<number, AgentRiskPulse> {
  if (!ironlockGlobalFreeze) return byIndex;
  const next: Record<number, AgentRiskPulse> = { ...byIndex };
  for (const a of CORE_WORKFORCE_AGENTS) {
    next[a.index] = {
      healthScore: Math.min(next[a.index]?.healthScore ?? 30, 28),
      riskLevel: "high",
    };
  }
  return next;
}

export async function ironwatchTelemetryPollOnce(): Promise<{
  byIndex: Record<number, AgentRiskPulse>;
  ironlockGlobalStateFreeze: boolean;
  quarantineHardBanActive: boolean;
}> {
  let ironlockGlobalStateFreeze = false;
  let quarantineHardBanActive = false;
  try {
    const res = await fetch("/api/ironwatch/layout-signal", { cache: "no-store" });
    const body = (await res.json().catch(() => ({}))) as IronwatchLayoutSignalResponse;
    ironlockGlobalStateFreeze = Boolean(body.ironlockGlobalStateFreezeActive);
    quarantineHardBanActive = Boolean(body.quarantineHardBanActive);
  } catch {
    ironlockGlobalStateFreeze = false;
    quarantineHardBanActive = false;
  }
  const tick = Date.now();
  const raw = computeIronwatchAgentHealthTable(tick);
  const byIndex = applyIronlockStaticRedFreeze(raw, ironlockGlobalStateFreeze);
  return { byIndex, ironlockGlobalStateFreeze, quarantineHardBanActive };
}
