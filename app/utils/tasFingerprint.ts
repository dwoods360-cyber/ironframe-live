import "server-only";

import { copyFileSync, existsSync, readFileSync } from "fs";
import { join } from "path";
import { ThreatState } from "@prisma/client";
import prisma from "@/lib/prisma";
import { auditLogCreateLoose } from "@/lib/auditLogLoose";
import {
  SYSTEM_OWNER_ID,
} from "@/app/config/constitutionalAuthority";
import {
  assessTasMdIntegritySync,
  getTasMdAbsolutePath,
  type TasMdIntegrityAssessment,
  type TasMdIntegrityFailureReason,
} from "@/app/lib/tasMdIntegrity";
import {
  FORENSIC_ATTESTATION_MIN_NORMAL,
  FORENSIC_ATTESTATION_MIN_VOID,
  FORENSIC_VOID_JUSTIFICATION_MESSAGE,
} from "@/app/utils/constitutionalForensicGates";
import { readGovernanceMaturityStateSync } from "@/app/lib/governanceMaturityState";
import {
  isNuclearOverrideKeyExhausted,
  markNuclearOverrideKeySpent,
  NUCLEAR_OVERRIDE_KEY_EXHAUSTED_MESSAGE,
} from "@/app/lib/constitutionalNuclearOverrideState";
import {
  verifyConstitutionalOverrideKey,
  verifyConstitutionalOverrideKeyParts,
} from "@/app/utils/constitutionalOverrideVerify";
import type { EmergencySealSegments } from "@/app/lib/emergencySeal";
import { CORE_WORKFORCE_AGENTS } from "@/app/config/agents";
import {
  mergeIngestionDetailsPatch,
  mergeIngestionDetailsPatchJson,
  parseIngestionDetailsForMerge,
} from "@/app/utils/ingestionDetailsMerge";
import { TENANT_UUIDS } from "@/app/utils/tenantIsolation";
import {
  armDeadManSwitchOnEmergency,
  checkAndExecuteDeadMansSwitch,
  readDeadManSwitch,
  recordDeadManSwitchResolution,
} from "@/app/lib/deadMansSwitch";
import {
  clearChaosConstitutionalVoid,
  isChaosConstitutionalVoidActive,
} from "@/app/lib/chaosConstitutionalVoid";

/** Irontech (Agent 04) — sole permitted job during constitutional void. */
export const IRONTECH_AGENT_LABEL = "Irontech";
export const IRONTECH_RESTORATION_FROM_GOLD_IMAGE = "restorationFromGoldImage" as const;
export type IrontechEmergencyJob = typeof IRONTECH_RESTORATION_FROM_GOLD_IMAGE;

const GOLD_TAS_CANDIDATE_PATHS = [
  join(process.cwd(), "storage", "constitutional", "TAS.md.gold"),
  join(process.cwd(), "docs", "TAS.md.gold"),
] as const;

/** IngestionDetails patch key — Ironlock (Agent 6) constitutional hard freeze. */
export const IRONLOCK_CONSTITUTIONAL_EMERGENCY_KEY = "ironlockConstitutionalEmergency";

export type IronlockConstitutionalEmergencyPatch = {
  type: "INTERNAL_QUARANTINE";
  reason: "CONSTITUTIONAL_VOID";
  frozenAt: string;
  frozenBy: "IRONLOCK_AGENT_06";
  threatStatusOverlay: "FROZEN";
};

export type TasFingerprintSnapshot = {
  isConstitutionalEmergency: boolean;
  constitutionalRebaselinePending: boolean;
  /** Owner override active — operations allowed at elevated forensic bar until TAS.md is valid. */
  constitutionalDegradedMode: boolean;
  /** Per-tenant chaos drill void (`CONSTITUTIONAL_COLLAPSE`). */
  chaosSimulationActive: boolean;
  sha256: string | null;
  failureReason: TasMdIntegrityFailureReason | null;
  failureMessage: string | null;
  checkedAt: string;
  ironlockFreezeApplied: boolean;
  requiredForensicAttestationMin: number;
  isOverrideSpent: boolean;
};

const SNAPSHOT_CACHE_MS = 1200;
const SYSTEM_FATAL_OPERATOR = "SYSTEM_IRONLOCK";
const SYSTEM_FATAL_ACTION = "SYSTEM_FATAL";
const SYSTEM_FATAL_JUSTIFICATION =
  "[SYSTEM_FATAL] — CONSTITUTIONAL_EMERGENCY — System operating without TAS.md authority. All agents in Hard Freeze.";

let cachedSnapshot: TasFingerprintSnapshot | null = null;
let cachedAtMs = 0;
let cachedTenantScope: string | null = null;
let ironlockFreezeApplied = false;
let constitutionalRebaselinePending = false;
let constitutionalDegradedMode = false;
let emergencyFatalLogged = false;
let lastKnownGoodSha256: string | null = null;

function requiredForensicMin(assessment: TasMdIntegrityAssessment): number {
  if (!assessment.ok || constitutionalDegradedMode) {
    return FORENSIC_ATTESTATION_MIN_VOID;
  }
  return FORENSIC_ATTESTATION_MIN_NORMAL;
}

function buildSnapshot(
  assessment: TasMdIntegrityAssessment,
  chaosSimulationActive: boolean,
): TasFingerprintSnapshot {
  const checkedAt = new Date().toISOString();
  const min = requiredForensicMin(assessment);
  const overrideSpent = isNuclearOverrideKeyExhausted();
  if (assessment.ok) {
    return {
      isConstitutionalEmergency: false,
      constitutionalRebaselinePending,
      constitutionalDegradedMode: false,
      chaosSimulationActive: false,
      sha256: assessment.sha256,
      failureReason: null,
      failureMessage: null,
      checkedAt,
      ironlockFreezeApplied,
      requiredForensicAttestationMin: constitutionalDegradedMode
        ? FORENSIC_ATTESTATION_MIN_VOID
        : FORENSIC_ATTESTATION_MIN_NORMAL,
      isOverrideSpent: overrideSpent,
    };
  }
  return {
    isConstitutionalEmergency: true,
    constitutionalRebaselinePending: constitutionalDegradedMode ? constitutionalRebaselinePending : false,
    constitutionalDegradedMode,
    chaosSimulationActive,
    sha256: null,
    failureReason: assessment.reason,
    failureMessage: assessment.message,
    checkedAt,
    ironlockFreezeApplied,
    requiredForensicAttestationMin: min,
    isOverrideSpent: overrideSpent,
  };
}

function readAssessment(tenantId?: string | null): TasMdIntegrityAssessment {
  if (tenantId?.trim() && isChaosConstitutionalVoidActive(tenantId)) {
    return {
      ok: false,
      reason: "INVALID_HASH",
      message: `[CHAOS:CONSTITUTIONAL_COLLAPSE] Simulated TAS.md void for tenant ${tenantId.trim()}`,
    };
  }
  const assessment = assessTasMdIntegritySync();
  if (process.env.NODE_ENV === "development" && assessment.ok) {
    releaseDevIronlockLatches();
  }
  return assessment;
}

/** Local dev: drop in-memory Ironlock void latches when TAS.md is present (HMR-safe). */
function releaseDevIronlockLatches(): void {
  if (
    !ironlockFreezeApplied &&
    !constitutionalRebaselinePending &&
    !emergencyFatalLogged &&
    !constitutionalDegradedMode
  ) {
    return;
  }
  ironlockFreezeApplied = false;
  constitutionalRebaselinePending = false;
  emergencyFatalLogged = false;
  constitutionalDegradedMode = false;
  invalidateTasFingerprintCache();
  console.log("[tasFingerprint][dev] Ironlock constitutional latch cleared — TAS.md validated");
}

export function invalidateTasFingerprintCache(): void {
  cachedSnapshot = null;
  cachedAtMs = 0;
  cachedTenantScope = null;
}

/**
 * Global constitutional integrity snapshot (singleton cache).
 * Re-evaluated on each call after {@link SNAPSHOT_CACHE_MS}.
 */
export function getTasFingerprintSnapshot(options?: {
  forceRefresh?: boolean;
  tenantId?: string | null;
}): TasFingerprintSnapshot {
  const tenantScope = options?.tenantId?.trim().toLowerCase() ?? null;
  const now = Date.now();
  if (
    !options?.forceRefresh &&
    cachedSnapshot &&
    cachedTenantScope === tenantScope &&
    now - cachedAtMs < SNAPSHOT_CACHE_MS
  ) {
    return cachedSnapshot;
  }
  const assessment = readAssessment(tenantScope);
  const chaosSimulationActive = Boolean(tenantScope && isChaosConstitutionalVoidActive(tenantScope));
  cachedSnapshot = buildSnapshot(assessment, chaosSimulationActive);
  cachedTenantScope = tenantScope;
  cachedAtMs = now;
  if (assessment.ok) {
    lastKnownGoodSha256 = assessment.sha256;
  }
  return cachedSnapshot;
}

export function isConstitutionalEmergency(): boolean {
  return getTasFingerprintSnapshot().isConstitutionalEmergency;
}

export function isConstitutionalRebaselinePending(): boolean {
  return getTasFingerprintSnapshot().constitutionalRebaselinePending;
}

export function isConstitutionalDegradedMode(): boolean {
  return constitutionalDegradedMode;
}

export function getRequiredForensicAttestationMin(tenantId?: string | null): number {
  const constitutional = requiredForensicMin(readAssessment(tenantId));
  const governance = readGovernanceMaturityStateSync().current.neutralizeMinChars;
  return Math.max(constitutional, governance);
}

export function isConstitutionalOverrideSpent(): boolean {
  return isNuclearOverrideKeyExhausted();
}

/**
 * During constitutional void only Irontech may run {@link IRONTECH_RESTORATION_FROM_GOLD_IMAGE}.
 * All other agent jobs (quarantine, delete, neutralize) remain frozen unless degraded override is active.
 */
export function isIrontechEmergencyJobAllowed(
  job: IrontechEmergencyJob,
  agentLabel?: string | null,
): boolean {
  if (job !== IRONTECH_RESTORATION_FROM_GOLD_IMAGE) return false;
  const agent = (agentLabel ?? IRONTECH_AGENT_LABEL).trim().toLowerCase();
  if (!/irontech|agent\s*04|agent\s*004|agent\s*11|agent\s*011/.test(agent)) return false;
  return isConstitutionalEmergency();
}

export function assertAgentActionAllowedDuringConstitutionalEmergency(
  agentLabel: string,
  job: string,
): void {
  if (!isConstitutionalEmergency() || constitutionalDegradedMode) return;
  if (
    isIrontechEmergencyJobAllowed(
      job as IrontechEmergencyJob,
      agentLabel,
    )
  ) {
    return;
  }
  throw new Error(
    `CONSTITUTIONAL EMERGENCY: Agent "${agentLabel}" job "${job}" frozen. Only Irontech (Agent 04) ${IRONTECH_RESTORATION_FROM_GOLD_IMAGE} is permitted.`,
  );
}

export function assertForensicAttestationLengthForContext(text: string | null | undefined): void {
  const assessment = readAssessment();
  const min = getRequiredForensicAttestationMin();
  const len = (text ?? "").trim().length;
  if (len < min) {
    if (!assessment.ok || constitutionalDegradedMode) {
      throw new Error(FORENSIC_VOID_JUSTIFICATION_MESSAGE);
    }
    throw new Error(
      `GRC: Forensic justification must be at least ${min} characters (received ${len}).`,
    );
  }
}

export function assertTasMdIntegrityOrThrow(): void {
  const snap = getTasFingerprintSnapshot({ forceRefresh: true });
  if (snap.constitutionalDegradedMode) {
    return;
  }
  if (snap.isConstitutionalEmergency) {
    throw new Error(
      `CONSTITUTIONAL EMERGENCY (${snap.failureReason ?? "VOID"}): No resolution without authorization. Restore /docs/TAS.md or SYSTEM_OWNER override.`,
    );
  }
  if (snap.constitutionalRebaselinePending) {
    throw new Error(
      "RE-BASELINE_VERIFICATION in progress (Irontech Agent 04). Operations remain frozen until constitutional baseline is verified.",
    );
  }
}

function resolveGoldTasSourcePath(): string | null {
  for (const p of GOLD_TAS_CANDIDATE_PATHS) {
    if (existsSync(p)) {
      try {
        const buf = readFileSync(p);
        if (buf.length > 0) return p;
      } catch {
        /* try next */
      }
    }
  }
  return null;
}

/**
 * Force-copy LKG gold image → live `docs/TAS.md` (Secret Store / repo mount / GitHub artifact path).
 */
export function forceRefreshTasMdFromGoldImage(): {
  ok: boolean;
  message: string;
  restoredFrom?: string;
  sha256?: string;
} {
  const goldPath = resolveGoldTasSourcePath();
  if (!goldPath) {
    return {
      ok: false,
      message: "No gold image found (storage/constitutional/TAS.md.gold or docs/TAS.md.gold).",
    };
  }
  const dest = getTasMdAbsolutePath();
  try {
    copyFileSync(goldPath, dest);
    cachedSnapshot = null;
    cachedAtMs = 0;
    const assessment = readAssessment();
    if (!assessment.ok) {
      return { ok: false, message: `Gold image copied but integrity check failed: ${assessment.message}` };
    }
    lastKnownGoodSha256 = assessment.sha256;
    return {
      ok: true,
      message: "TAS.md refreshed from secure gold image.",
      restoredFrom: goldPath,
      sha256: assessment.sha256,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "copy failed";
    return { ok: false, message: msg };
  }
}

/**
 * Irontech (Agent 04) self-healing: restore `docs/TAS.md` from LKG gold image during constitutional void.
 */
export async function performIrontechRestorationFromGoldImage(): Promise<{
  ok: boolean;
  message: string;
  restoredFrom?: string;
}> {
  if (!isConstitutionalEmergency()) {
    return { ok: false, message: "Constitutional baseline intact — restoration not required." };
  }
  assertAgentActionAllowedDuringConstitutionalEmergency(
    IRONTECH_AGENT_LABEL,
    IRONTECH_RESTORATION_FROM_GOLD_IMAGE,
  );
  const result = forceRefreshTasMdFromGoldImage();
  return {
    ok: result.ok,
    message: result.ok
      ? "TAS.md restored from LKG gold image. Awaiting RE-BASELINE_VERIFICATION."
      : result.message,
    restoredFrom: result.restoredFrom,
  };
}

function terminateConstitutionalEmergencySessions(): void {
  constitutionalDegradedMode = false;
  constitutionalRebaselinePending = false;
  cachedSnapshot = null;
  cachedAtMs = 0;
}

const SYSTEM_REBIRTH_ACTION = "SYSTEM_REBIRTH";

async function logSystemRebirthAudit(params: {
  newHash: string;
  priorState: "DEGRADED_VOID" | "CONSTITUTIONAL_VOID";
  previousFingerprint: string | null;
}): Promise<void> {
  const justification = `[SYSTEM_REBIRTH] — Constitutional authority restored via Manual Override Key — New Fingerprint: ${params.newHash} — Previous State: ${params.priorState}.`;
  try {
    await auditLogCreateLoose({
      data: {
        action: SYSTEM_REBIRTH_ACTION,
        justification,
        operatorId: SYSTEM_OWNER_ID,
        threatId: null,
        isSimulation: false,
        governance_tenant_uuid: TENANT_UUIDS.medshield,
      },
    });
  } catch (e) {
    console.error("[tasFingerprint] SYSTEM_REBIRTH audit failed", e);
  }
}


/** Broadcast new constitutional SHA-256 to all 19 workforce agents (forensic ledger). */
export async function broadcastConstitutionalFingerprintToWorkforce(
  sha256: string,
): Promise<void> {
  const roster = CORE_WORKFORCE_AGENTS.map((a) => ({
    index: a.index,
    name: a.name,
    constitutionalHash: sha256,
    broadcastAt: new Date().toISOString(),
  }));
  try {
    await auditLogCreateLoose({
      data: {
        action: "CONSTITUTIONAL_HASH_BROADCAST",
        justification: JSON.stringify({
          event: "WORKFORCE_REBASELINE_BROADCAST",
          constitutionalHash: sha256,
          agentCount: roster.length,
          agents: roster,
        }),
        operatorId: "SYSTEM_IRONTECH",
        threatId: null,
        isSimulation: false,
        governance_tenant_uuid: TENANT_UUIDS.medshield,
      },
    });
  } catch (e) {
    console.error("[tasFingerprint] workforce hash broadcast failed", e);
  }
}

export type ConstitutionalPriorVoidState = "DEGRADED_VOID" | "CONSTITUTIONAL_VOID";

/**
 * Nuclear override acceptance — terminate emergency sessions, gold refresh, re-baseline, workforce broadcast.
 */
export async function executeNuclearConstitutionalRebirth(
  priorState: ConstitutionalPriorVoidState,
): Promise<{ ok: true; sha256: string } | { ok: false; error: string }> {
  const previousFingerprint = lastKnownGoodSha256;
  terminateConstitutionalEmergencySessions();

  const gold = forceRefreshTasMdFromGoldImage();
  if (!gold.ok || !gold.sha256) {
    return { ok: false, error: gold.message };
  }

  constitutionalRebaselinePending = true;
  const rebaseline = await performIrontechRebaselineVerification();
  if (!rebaseline.ok || !rebaseline.sha256) {
    return { ok: false, error: "RE-BASELINE_VERIFICATION failed after gold image refresh." };
  }

  await broadcastConstitutionalFingerprintToWorkforce(rebaseline.sha256);
  await logSystemRebirthAudit({
    newHash: rebaseline.sha256,
    priorState,
    previousFingerprint,
  });

  await recordDeadManSwitchResolution(rebaseline.sha256);
  getTasFingerprintSnapshot({ forceRefresh: true });
  return { ok: true, sha256: rebaseline.sha256 };
}

/**
 * Nuclear one-time override — spend key, force system-wide rebirth (not degraded limbo).
 */
export async function applyConstitutionalOwnerOverride(
  input:
    | string
    | (EmergencySealSegments & { overrideKey?: string }),
  authorizedByOperatorId: string,
): Promise<
  | { ok: true; sha256: string; priorState: ConstitutionalPriorVoidState }
  | { ok: false; error: string }
> {
  if (
    authorizedByOperatorId.trim() !== SYSTEM_OWNER_ID &&
    authorizedByOperatorId.trim().toLowerCase() !== SYSTEM_OWNER_ID.toLowerCase()
  ) {
    return { ok: false, error: "Override key may only be submitted by SYSTEM_OWNER_ID." };
  }

  let verified: { ok: true; masterSha256: string } | { ok: false; error: string };
  if (typeof input === "string") {
    verified = await verifyConstitutionalOverrideKey(input);
  } else if (input.overrideKey) {
    verified = await verifyConstitutionalOverrideKey(input.overrideKey);
  } else {
    verified = await verifyConstitutionalOverrideKeyParts({
      vault: input.vault,
      human: input.human,
      ciso: input.ciso,
      staff: input.staff,
    });
  }
  if (!verified.ok) {
    return { ok: false, error: verified.error };
  }

  const priorState: ConstitutionalPriorVoidState = constitutionalDegradedMode
    ? "DEGRADED_VOID"
    : "CONSTITUTIONAL_VOID";

  markNuclearOverrideKeySpent(authorizedByOperatorId, verified.masterSha256);

  const rebirth = await executeNuclearConstitutionalRebirth(priorState);
  if (!rebirth.ok) {
    return { ok: false, error: rebirth.error };
  }
  return { ok: true, sha256: rebirth.sha256, priorState };
}

export function readIronlockEmergencyFromIngestion(
  raw: string | null | undefined,
): IronlockConstitutionalEmergencyPatch | null {
  if (!raw?.trim()) return null;
  try {
    const o = parseIngestionDetailsForMerge(raw) as Record<string, unknown>;
    const block = o[IRONLOCK_CONSTITUTIONAL_EMERGENCY_KEY];
    if (block == null || typeof block !== "object" || Array.isArray(block)) return null;
    const b = block as Record<string, unknown>;
    if (b.type === "INTERNAL_QUARANTINE" && b.reason === "CONSTITUTIONAL_VOID") {
      return block as IronlockConstitutionalEmergencyPatch;
    }
  } catch {
    /* non-JSON legacy */
  }
  return null;
}

const ACTIVE_THREAT_STATES: ThreatState[] = [
  ThreatState.PIPELINE,
  ThreatState.IDENTIFIED,
  ThreatState.CONFIRMED,
  ThreatState.MITIGATED,
];

function buildEmergencyPatch(): IronlockConstitutionalEmergencyPatch {
  return {
    type: "INTERNAL_QUARANTINE",
    reason: "CONSTITUTIONAL_VOID",
    frozenAt: new Date().toISOString(),
    frozenBy: "IRONLOCK_AGENT_06",
    threatStatusOverlay: "FROZEN",
  };
}

/**
 * Ironlock (Agent 6): persist INTERNAL_QUARANTINE on every non-terminal threat (prod + shadow).
 */
export async function applyIronlockConstitutionalFreeze(): Promise<{ threatsFrozen: number; shadowFrozen: number }> {
  if (ironlockFreezeApplied) {
    return { threatsFrozen: 0, shadowFrozen: 0 };
  }
  const patch = buildEmergencyPatch();
  const patchJson = patch as unknown as Record<string, import("@prisma/client").Prisma.InputJsonValue>;
  let threatsFrozen = 0;
  let shadowFrozen = 0;

  const prodRows = await prisma.threatEvent.findMany({
    where: { status: { in: ACTIVE_THREAT_STATES } },
    select: { id: true, ingestionDetails: true },
  });
  for (const row of prodRows) {
    const merged = mergeIngestionDetailsPatch(row.ingestionDetails, {
      [IRONLOCK_CONSTITUTIONAL_EMERGENCY_KEY]: patchJson,
    });
    await prisma.threatEvent.update({
      where: { id: row.id },
      data: { ingestionDetails: merged },
    });
    threatsFrozen += 1;
  }

  const simRows = await prisma.riskEvent.findMany({
    where: { status: { in: ACTIVE_THREAT_STATES } },
    select: { id: true, tenantId: true, ingestionDetails: true },
  });
  for (const row of simRows) {
    const merged = mergeIngestionDetailsPatchJson(row.ingestionDetails, {
      [IRONLOCK_CONSTITUTIONAL_EMERGENCY_KEY]: patchJson,
    });
    await prisma.riskEvent.updateMany({
      where: { id: row.id, tenantId: row.tenantId },
      data: { ingestionDetails: merged },
    });
    shadowFrozen += 1;
  }

  ironlockFreezeApplied = true;
  if (cachedSnapshot) {
    cachedSnapshot = { ...cachedSnapshot, ironlockFreezeApplied: true };
  }
  return { threatsFrozen, shadowFrozen };
}

/**
 * Ironlock tenant-scoped freeze — chaos `CONSTITUTIONAL_COLLAPSE` (no global singleton latch).
 */
export async function applyIronlockConstitutionalFreezeForTenant(
  tenantId: string,
): Promise<{ threatsFrozen: number; shadowFrozen: number }> {
  const tid = tenantId.trim();
  if (!tid) return { threatsFrozen: 0, shadowFrozen: 0 };

  const patch = buildEmergencyPatch();
  const patchJson = patch as unknown as Record<string, import("@prisma/client").Prisma.InputJsonValue>;
  let threatsFrozen = 0;
  let shadowFrozen = 0;

  const companies = await prisma.company.findMany({
    where: { tenantId: tid },
    select: { id: true },
  });
  const companyIds = companies.map((c) => c.id);

  if (companyIds.length > 0) {
    const prodRows = await prisma.threatEvent.findMany({
      where: {
        status: { in: ACTIVE_THREAT_STATES },
        tenantCompanyId: { in: companyIds },
      },
      select: { id: true, ingestionDetails: true },
    });
    for (const row of prodRows) {
      const merged = mergeIngestionDetailsPatch(row.ingestionDetails, {
        [IRONLOCK_CONSTITUTIONAL_EMERGENCY_KEY]: patchJson,
      });
      await prisma.threatEvent.update({
        where: { id: row.id },
        data: { ingestionDetails: merged },
      });
      threatsFrozen += 1;
    }
  }

  const simRows = await prisma.riskEvent.findMany({
    where: { status: { in: ACTIVE_THREAT_STATES }, tenantId: tid },
    select: { id: true, tenantId: true, ingestionDetails: true },
  });
  for (const row of simRows) {
    const merged = mergeIngestionDetailsPatchJson(row.ingestionDetails, {
      [IRONLOCK_CONSTITUTIONAL_EMERGENCY_KEY]: patchJson,
    });
    await prisma.riskEvent.updateMany({
      where: { id: row.id, tenantId: row.tenantId },
      data: { ingestionDetails: merged },
    });
    shadowFrozen += 1;
  }

  if (cachedSnapshot) {
    cachedSnapshot = { ...cachedSnapshot, ironlockFreezeApplied: true };
  }

  try {
    const { appendChaosRunEvent } = await import("@/app/lib/chaosRunTelemetry");
    appendChaosRunEvent(tid, "IRONLOCK_FREEZE", { threatsFrozen, shadowFrozen });
  } catch {
    /* telemetry optional */
  }

  return { threatsFrozen, shadowFrozen };
}

/** Forensic void log — best-effort; never blocks emergency enforcement. */
export async function logConstitutionalEmergencyFatal(): Promise<void> {
  if (emergencyFatalLogged) return;
  try {
    await auditLogCreateLoose({
      data: {
        action: SYSTEM_FATAL_ACTION,
        justification: SYSTEM_FATAL_JUSTIFICATION,
        operatorId: SYSTEM_FATAL_OPERATOR,
        threatId: null,
        isSimulation: false,
        governance_tenant_uuid: TENANT_UUIDS.medshield,
      },
    });
    emergencyFatalLogged = true;
  } catch (e) {
    console.error("[tasFingerprint] CONSTITUTIONAL_EMERGENCY audit append failed", e);
  }
}

function clearEmergencyPatchFromIngestion(
  raw: string | null | undefined,
): string | import("@prisma/client").Prisma.InputJsonValue | null {
  const base = parseIngestionDetailsForMerge(raw ?? null);
  if (!(IRONLOCK_CONSTITUTIONAL_EMERGENCY_KEY in base)) {
    return raw ?? null;
  }
  const next = { ...base };
  delete next[IRONLOCK_CONSTITUTIONAL_EMERGENCY_KEY];
  if (typeof raw === "string" || raw == null) {
    return JSON.stringify(next);
  }
  return next as import("@prisma/client").Prisma.InputJsonValue;
}

/**
 * Irontech (Agent 04): RE-BASELINE_VERIFICATION after TAS.md restoration.
 * Clears Ironlock patches and lifts operational freeze when integrity is valid.
 */
export async function performIrontechRebaselineVerification(): Promise<{
  ok: boolean;
  sha256: string | null;
  clearedProd: number;
  clearedShadow: number;
}> {
  const assessment = readAssessment();
  if (!assessment.ok) {
    constitutionalRebaselinePending = true;
    return { ok: false, sha256: null, clearedProd: 0, clearedShadow: 0 };
  }

  let clearedProd = 0;
  let clearedShadow = 0;

  const prodRows = await prisma.threatEvent.findMany({
    where: { ingestionDetails: { contains: IRONLOCK_CONSTITUTIONAL_EMERGENCY_KEY } },
    select: { id: true, ingestionDetails: true },
  });
  for (const row of prodRows) {
    const cleared = clearEmergencyPatchFromIngestion(row.ingestionDetails);
    if (cleared === row.ingestionDetails) continue;
    await prisma.threatEvent.update({
      where: { id: row.id },
      data: { ingestionDetails: typeof cleared === "string" ? cleared : JSON.stringify(cleared) },
    });
    clearedProd += 1;
  }

  const simCandidates = await prisma.riskEvent.findMany({
    where: { status: { in: ACTIVE_THREAT_STATES } },
    select: { id: true, tenantId: true, ingestionDetails: true },
  });
  const simRows = simCandidates.filter((row) => {
    const raw =
      typeof row.ingestionDetails === "string"
        ? row.ingestionDetails
        : row.ingestionDetails != null
          ? JSON.stringify(row.ingestionDetails)
          : null;
    return readIronlockEmergencyFromIngestion(raw) != null;
  });
  for (const row of simRows) {
    const cleared = clearEmergencyPatchFromIngestion(
      typeof row.ingestionDetails === "string"
        ? row.ingestionDetails
        : row.ingestionDetails != null
          ? JSON.stringify(row.ingestionDetails)
          : null,
    );
    await prisma.riskEvent.updateMany({
      where: { id: row.id, tenantId: row.tenantId },
      data: { ingestionDetails: cleared as import("@prisma/client").Prisma.InputJsonValue },
    });
    clearedShadow += 1;
  }

  try {
    await auditLogCreateLoose({
      data: {
        action: "RE_BASELINE_VERIFICATION",
        justification: JSON.stringify({
          agent: "Irontech",
          agentIndex: 4,
          event: "RE-BASELINE_VERIFICATION",
          constitutionalHash: assessment.sha256,
          priorEmergencySha256: lastKnownGoodSha256,
          clearedProd,
          clearedShadow,
          message: "Constitutional baseline restored; Ironlock hard freeze released.",
        }),
        operatorId: "SYSTEM_IRONTECH",
        threatId: null,
        isSimulation: false,
        governance_tenant_uuid: TENANT_UUIDS.medshield,
      },
    });
  } catch (e) {
    console.error("[tasFingerprint] RE-BASELINE_VERIFICATION audit failed", e);
  }

  constitutionalRebaselinePending = false;
  constitutionalDegradedMode = false;
  ironlockFreezeApplied = false;
  emergencyFatalLogged = false;
  lastKnownGoodSha256 = assessment.sha256;
  cachedSnapshot = buildSnapshot(assessment, false);
  cachedAtMs = Date.now();
  await recordDeadManSwitchResolution(assessment.sha256);

  const dms = await readDeadManSwitch();
  if (dms?.triggerTenantId && dms.isSimulation) {
    clearChaosConstitutionalVoid(dms.triggerTenantId);
    invalidateTasFingerprintCache();
  }

  return { ok: true, sha256: assessment.sha256, clearedProd, clearedShadow };
}

/**
 * Called from integrity API on each poll: enforce freeze + logging on void;
 * run rebaseline when TAS.md returns after an emergency episode.
 */
export async function syncConstitutionalIntegrityEnforcement(
  tenantId?: string | null,
): Promise<TasFingerprintSnapshot> {
  const tenantScope = tenantId?.trim() ?? null;
  const chaosVoid = Boolean(tenantScope && isChaosConstitutionalVoidActive(tenantScope));
  const assessment = readAssessment(tenantScope);

  if (process.env.NODE_ENV === "development" && assessment.ok && !chaosVoid) {
    return getTasFingerprintSnapshot({ forceRefresh: true, tenantId: tenantScope });
  }

  if (
    assessment.ok &&
    !chaosVoid &&
    !ironlockFreezeApplied &&
    !emergencyFatalLogged &&
    !constitutionalRebaselinePending
  ) {
    return getTasFingerprintSnapshot({ forceRefresh: true, tenantId: tenantScope });
  }

  const priorEmergency = cachedSnapshot?.isConstitutionalEmergency ?? false;
  const snap = getTasFingerprintSnapshot({ forceRefresh: true, tenantId: tenantScope });

  if (snap.isConstitutionalEmergency) {
    if (chaosVoid && tenantScope) {
      await armDeadManSwitchOnEmergency(tenantScope, { isSimulation: true });
      await checkAndExecuteDeadMansSwitch(true, tenantScope);
      await applyIronlockConstitutionalFreezeForTenant(tenantScope);
    } else {
      await armDeadManSwitchOnEmergency(tenantScope ?? undefined);
      await checkAndExecuteDeadMansSwitch(true, tenantScope);
      if (!constitutionalDegradedMode) {
        await logConstitutionalEmergencyFatal();
        await applyIronlockConstitutionalFreeze();
      }
    }
    return getTasFingerprintSnapshot({ forceRefresh: true, tenantId: tenantScope });
  }

  if (priorEmergency || ironlockFreezeApplied || emergencyFatalLogged) {
    constitutionalRebaselinePending = true;
    if (cachedSnapshot) {
      cachedSnapshot = {
        ...snap,
        constitutionalRebaselinePending: true,
      };
    }
    await performIrontechRebaselineVerification();
    if (tenantScope) {
      clearChaosConstitutionalVoid(tenantScope);
    }
  }

  return getTasFingerprintSnapshot({ forceRefresh: true, tenantId: tenantScope });
}

/** Client/API: overlay FROZEN when global emergency or per-row Ironlock patch exists. */
export function resolveThreatStatusUnderConstitutionalLock(
  threatStatus: string,
  ingestionDetails: string | null | undefined,
  snap?: TasFingerprintSnapshot,
): string {
  const integrity = snap ?? getTasFingerprintSnapshot();
  if (integrity.constitutionalDegradedMode) {
    return threatStatus;
  }
  if (integrity.isConstitutionalEmergency || integrity.constitutionalRebaselinePending) {
    return "FROZEN";
  }
  if (readIronlockEmergencyFromIngestion(ingestionDetails)) {
    return "FROZEN";
  }
  return threatStatus;
}
