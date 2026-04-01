import "server-only";

import { unstable_noStore as noStore } from "next/cache";
import prisma from "@/lib/prisma";
import { ThreatState } from "@prisma/client";
import {
  frameworkBadgesForChaosScenario,
  type FrameworkBadgeKind,
} from "@/app/utils/grcComplianceUi";
import type { ServerIntegrityLedgerRow } from "@/app/types/integrityLedger";

const SCENARIO_AUDIT_TITLES: Record<string, string> = {
  INTERNAL: "Scenario 1: Internal Chaos Recovery",
  HOME_SERVER: "Scenario 2: Home Server Multi-Attempt Recovery",
  CLOUD_EXFIL: "Scenario 3: Cloud Exfiltration / Ironlock Quarantine",
  REMOTE_SUPPORT: "Scenario 4: Remote Support / Sidecar Handoff",
  CASCADING_FAILURE: "Scenario 5: Cascading Failure Rebirth",
};

function parseIngestion(raw: string | null): Record<string, unknown> {
  if (raw == null || raw.trim() === "") return {};
  try {
    const o = JSON.parse(raw) as unknown;
    return o !== null && typeof o === "object" && !Array.isArray(o) ? (o as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function recoverySecondsFromIngestion(
  rec: Record<string, unknown>,
  createdAtMs: number,
): number | null {
  const direct = rec.integrityLedgerRecoverySeconds;
  if (typeof direct === "number" && Number.isFinite(direct) && direct >= 0) {
    return Math.round(direct * 10) / 10;
  }
  const end =
    typeof rec.autonomousRecoveredAt === "string" ? Date.parse(rec.autonomousRecoveredAt) : NaN;
  if (!Number.isFinite(end) || !Number.isFinite(createdAtMs)) return null;
  const sec = (end - createdAtMs) / 1000;
  if (!Number.isFinite(sec) || sec < 0) return null;
  return Math.round(sec * 10) / 10;
}

const CHAOS_SCENARIOS = new Set([
  "INTERNAL",
  "HOME_SERVER",
  "CLOUD_EXFIL",
  "REMOTE_SUPPORT",
  "CASCADING_FAILURE",
]);

function isChaosResolvedRow(rec: Record<string, unknown>): boolean {
  if (rec.isChaosTest === true) return true;
  const scen =
    typeof rec.chaosScenario === "string" ? rec.chaosScenario.trim().toUpperCase() : "";
  return CHAOS_SCENARIOS.has(scen);
}

/**
 * Autonomous / agentic heal without chaos JSON tags (e.g. `executeWithRetry` resolutions).
 * Requires archived lifecycle + recovery timestamp/metric; no filter on `userId` (human vs SYSTEM_IRONTECH_AUTO).
 */
function isAgenticHealLedgerCandidate(rec: Record<string, unknown>): boolean {
  if (isChaosResolvedRow(rec)) return false;
  if (rec.autonomousRecovery !== true || rec.lifecycleState !== "archived") return false;
  if (typeof rec.autonomousRecoveredAt === "string" && rec.autonomousRecoveredAt.trim().length > 0) {
    return true;
  }
  if (
    typeof rec.integrityLedgerRecoverySeconds === "number" &&
    Number.isFinite(rec.integrityLedgerRecoverySeconds)
  ) {
    return true;
  }
  return false;
}

/**
 * Scenario 5: only append-only ledger snapshots (each `ThreatEvent.create` in `runIsolatedCascadeDrill`)
 * appear in the hub — `integrityHubLedgerEntry: true` + `chaosScenario: CASCADING_FAILURE` in JSON.
 * Other scenarios: operational row is updated in place with `isChaosTest` / `chaosScenario` and matches this filter.
 */
function includeResolvedChaosInLedger(rec: Record<string, unknown>): boolean {
  const scen =
    typeof rec.chaosScenario === "string" ? rec.chaosScenario.trim().toUpperCase() : "";
  if (scen === "CASCADING_FAILURE") {
    return rec.integrityHubLedgerEntry === true;
  }
  if (isChaosResolvedRow(rec)) return true;
  if (isAgenticHealLedgerCandidate(rec)) return true;
  return false;
}

function ledgerRecordedAtIso(
  rec: Record<string, unknown>,
  updatedAt: Date,
): string {
  const primary =
    typeof rec.integrityResolvedAt === "string" ? Date.parse(rec.integrityResolvedAt) : NaN;
  if (Number.isFinite(primary)) {
    return new Date(primary).toISOString();
  }
  const resolved =
    typeof rec.resolvedAt === "string" ? Date.parse(rec.resolvedAt) : NaN;
  if (Number.isFinite(resolved)) {
    return new Date(resolved).toISOString();
  }
  const end =
    typeof rec.autonomousRecoveredAt === "string" ? Date.parse(rec.autonomousRecoveredAt) : NaN;
  if (Number.isFinite(end)) {
    return new Date(end).toISOString();
  }
  return updatedAt.toISOString();
}

function ledgerAuthorizedUserId(rec: Record<string, unknown>): string {
  const a = rec.integrityAuthorizedUserId;
  if (typeof a === "string" && a.trim()) return a.trim();
  const u = rec.userId;
  if (typeof u === "string" && u.trim()) return u.trim();
  return "SYSTEM_IRONTECH_AUTO";
}

function ledgerAuthorizedDisplayName(rec: Record<string, unknown>, userId: string): string {
  const d = rec.integrityAuthorizedDisplayName;
  if (typeof d === "string" && d.trim()) return d.trim();
  return userId;
}

/**
 * Resolved chaos drills + agentic heals for the Integrity Hub (DB source of truth).
 * No filter on attribution: any `userId` / `SYSTEM_IRONTECH_AUTO` is included if ingestion matches chaos or heal rules.
 */
export async function fetchResolvedChaosLedgerRows(): Promise<ServerIntegrityLedgerRow[]> {
  noStore();

  const rows = await prisma.threatEvent.findMany({
    where: {
      status: { in: [ThreatState.RESOLVED, ThreatState.DE_ACKNOWLEDGED] },
    },
    orderBy: { updatedAt: "desc" },
    take: 400,
    select: {
      id: true,
      title: true,
      ingestionDetails: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  const out: ServerIntegrityLedgerRow[] = [];

  for (const r of rows) {
    const rec = parseIngestion(r.ingestionDetails);
    if (!includeResolvedChaosInLedger(rec)) continue;

    const scenRaw = typeof rec.chaosScenario === "string" ? rec.chaosScenario.trim().toUpperCase() : "";
    const scenario = scenRaw || null;
    const isChaos = rec.isChaosTest === true || Boolean(scenario);
    const badges = frameworkBadgesForChaosScenario(scenario, isChaos) as FrameworkBadgeKind[];

    const lkgRaw = rec.lkgAttestationIroncoreSha256;
    const attRaw = rec.attestationHash;
    const lkgHash =
      (typeof lkgRaw === "string" && lkgRaw.trim() ? lkgRaw.trim() : null) ??
      (typeof attRaw === "string" && attRaw.trim() ? attRaw.trim() : null);

    const recoverySeconds = recoverySecondsFromIngestion(rec, r.createdAt.getTime());

    const autonomous = rec.autonomousRecovery === true;
    const eventType = autonomous ? "AUTONOMOUS_RESOLVED" : "RESOLVED";

    const tsIso = ledgerRecordedAtIso(rec, r.updatedAt);
    const authId = ledgerAuthorizedUserId(rec);
    const rawAuthDisplay = ledgerAuthorizedDisplayName(rec, authId);
    const authDisplay =
      authId === "SYSTEM_IRONTECH_AUTO" && rawAuthDisplay === "SYSTEM_IRONTECH_AUTO"
        ? "Irontech (autonomous)"
        : rawAuthDisplay;
    const auditScenarioTitle =
      (scenario && SCENARIO_AUDIT_TITLES[scenario]) || r.title || "Chaos drill";

    out.push({
      id: r.id,
      threatId: r.id,
      title: r.title,
      auditScenarioTitle,
      recordedAt: tsIso,
      timestampIso: tsIso,
      authorizedUserId: authId,
      authorizedDisplayName: authDisplay,
      eventType,
      scenario,
      recoverySeconds,
      lkgAttestationIroncoreSha256: lkgHash,
      frameworkBadges: badges.map(String),
    });
  }

  out.sort(
    (a, b) =>
      new Date(b.timestampIso).getTime() - new Date(a.timestampIso).getTime(),
  );

  return out.slice(0, 200);
}
