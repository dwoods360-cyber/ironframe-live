import "server-only";

import type { Prisma } from "@prisma/client";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import prisma from "@/lib/prisma";
import { SECURITY_POSTURE_DUAL_LOCK } from "@/app/config/securityPosture";
import {
  POSTURE_DEGRADATION_PHASE_COOLDOWN,
  POSTURE_DEGRADATION_PHASE_PENDING,
  type PostureDegradationPhase,
} from "@/app/config/postureDegradation";
import type { RiskImpactReport } from "@/app/lib/riskImpactReport";

export type PostureDegradationWorkflowRecord = {
  phase: PostureDegradationPhase;
  targetPosture: typeof SECURITY_POSTURE_DUAL_LOCK;
  justification: string;
  requestedAt: string;
  requestedBy: string;
  cooldownEndsAt?: string;
  signaturesAttestedAt?: string;
  abortedAt?: string;
  abortedByRole?: string;
  riskImpactReport?: RiskImpactReport;
  cfoFinancialRiskAcknowledgedAt?: string;
  cfoFinancialRiskAcknowledgedBy?: string;
};

const STATE_DIR = join(process.cwd(), "storage", "constitutional");
const STATE_FILE = join(STATE_DIR, "posture-degradation-workflow.json");

function parseWorkflow(raw: unknown): PostureDegradationWorkflowRecord | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const phase = o.phase;
  if (phase !== POSTURE_DEGRADATION_PHASE_PENDING && phase !== POSTURE_DEGRADATION_PHASE_COOLDOWN) {
    return null;
  }
  if (o.targetPosture !== SECURITY_POSTURE_DUAL_LOCK) return null;
  if (typeof o.justification !== "string" || typeof o.requestedAt !== "string") return null;
  if (typeof o.requestedBy !== "string") return null;
  return {
    phase,
    targetPosture: SECURITY_POSTURE_DUAL_LOCK,
    justification: o.justification,
    requestedAt: o.requestedAt,
    requestedBy: o.requestedBy,
    cooldownEndsAt: typeof o.cooldownEndsAt === "string" ? o.cooldownEndsAt : undefined,
    signaturesAttestedAt:
      typeof o.signaturesAttestedAt === "string" ? o.signaturesAttestedAt : undefined,
    abortedAt: typeof o.abortedAt === "string" ? o.abortedAt : undefined,
    abortedByRole: typeof o.abortedByRole === "string" ? o.abortedByRole : undefined,
    riskImpactReport:
      o.riskImpactReport && typeof o.riskImpactReport === "object"
        ? (o.riskImpactReport as RiskImpactReport)
        : undefined,
    cfoFinancialRiskAcknowledgedAt:
      typeof o.cfoFinancialRiskAcknowledgedAt === "string" ? o.cfoFinancialRiskAcknowledgedAt : undefined,
    cfoFinancialRiskAcknowledgedBy:
      typeof o.cfoFinancialRiskAcknowledgedBy === "string" ? o.cfoFinancialRiskAcknowledgedBy : undefined,
  };
}

function readFileWorkflow(): PostureDegradationWorkflowRecord | null {
  try {
    if (!existsSync(STATE_FILE)) return null;
    return parseWorkflow(JSON.parse(readFileSync(STATE_FILE, "utf8")));
  } catch {
    return null;
  }
}

function writeFileWorkflow(record: PostureDegradationWorkflowRecord | null): void {
  if (!existsSync(STATE_DIR)) mkdirSync(STATE_DIR, { recursive: true });
  if (!record) {
    if (existsSync(STATE_FILE)) writeFileSync(STATE_FILE, "{}", "utf8");
    return;
  }
  writeFileSync(STATE_FILE, JSON.stringify(record, null, 2), "utf8");
}

export async function readPostureDegradationWorkflow(): Promise<PostureDegradationWorkflowRecord | null> {
  try {
    const row = await prisma.systemConfig.findUnique({
      where: { id: "global" },
      select: { postureDegradationWorkflow: true },
    });
    const parsed = parseWorkflow(row?.postureDegradationWorkflow ?? null);
    if (parsed) return parsed;
  } catch {
    /* schema not migrated — file fallback */
  }
  return readFileWorkflow();
}

export async function writePostureDegradationWorkflow(
  record: PostureDegradationWorkflowRecord | null,
): Promise<void> {
  writeFileWorkflow(record);
  try {
    await prisma.systemConfig.upsert({
      where: { id: "global" },
      create: {
        id: "global",
        postureDegradationWorkflow: (record ?? null) as unknown as Prisma.InputJsonValue,
      },
      update: {
        postureDegradationWorkflow: (record ?? null) as unknown as Prisma.InputJsonValue,
      },
    });
  } catch {
    /* file is source of truth until migration */
  }
}

export function cooldownRemainingMs(
  workflow: PostureDegradationWorkflowRecord,
  nowMs = Date.now(),
): number | null {
  if (workflow.phase !== POSTURE_DEGRADATION_PHASE_COOLDOWN || !workflow.cooldownEndsAt) {
    return null;
  }
  const end = Date.parse(workflow.cooldownEndsAt);
  if (!Number.isFinite(end)) return null;
  return Math.max(0, end - nowMs);
}

export function isCooldownExpired(
  workflow: PostureDegradationWorkflowRecord,
  nowMs = Date.now(),
): boolean {
  const remaining = cooldownRemainingMs(workflow, nowMs);
  return remaining !== null && remaining <= 0;
}
