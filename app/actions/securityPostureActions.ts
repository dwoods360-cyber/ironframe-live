"use server";

import { SecurityPosture as PrismaSecurityPosture } from "@prisma/client";
import prisma from "@/lib/prisma";
import {
  SECURITY_POSTURE_DUAL_LOCK,
  SECURITY_POSTURE_TRIPARTITE_LOCK,
  type SecurityPosture,
  isSecurityPosture,
} from "@/app/config/securityPosture";
import { generateNewEmergencySeal } from "@/app/lib/emergencySeal";
import { requireSystemOwnerSession } from "@/app/lib/constitutionalOwnerSession";
import { readPostureDegradationWorkflow } from "@/app/lib/postureDegradationWorkflow";

export type SecurityPostureConfigDto = {
  posture: SecurityPosture;
  segmentLengths: Record<string, number>;
  labels: { vault: string; second?: string; third?: string };
  sealGeneratedAt: string | null;
  degradationPending: boolean;
};

export async function getSecurityPostureConfig(): Promise<SecurityPostureConfigDto> {
  const pendingWorkflow = await readPostureDegradationWorkflow();
  const row = await prisma.systemConfig.findUnique({
    where: { id: "global" },
    select: { securityPosture: true, emergencySeal: true },
  });
  const posture: SecurityPosture =
    row?.securityPosture === PrismaSecurityPosture.TRIPARTITE_LOCK
      ? SECURITY_POSTURE_TRIPARTITE_LOCK
      : SECURITY_POSTURE_DUAL_LOCK;
  const sealRaw = row?.emergencySeal as { generatedAt?: string } | null;
  const degradationPending = pendingWorkflow != null;
  if (posture === SECURITY_POSTURE_TRIPARTITE_LOCK) {
    return {
      posture,
      segmentLengths: { vault: 22, ciso: 21, staff: 21 },
      labels: { vault: "Vault / Secret Store", second: "CISO", third: "Staff" },
      sealGeneratedAt: sealRaw?.generatedAt ?? null,
      degradationPending,
    };
  }
  return {
    posture,
    segmentLengths: { vault: 32, human: 32 },
    labels: { vault: "Vault / Secret Store", second: "Human (SYSTEM_OWNER)" },
    sealGeneratedAt: sealRaw?.generatedAt ?? null,
    degradationPending,
  };
}

export type SaveSecurityPostureResult =
  | {
      ok: true;
      posture: SecurityPosture;
      sealGeneratedAt: string;
      distributionHint: string;
    }
  | {
      ok: false;
      error: string;
      requiresDegradationJustification?: boolean;
      requiresBoardLevelApproval?: boolean;
    };

/**
 * Persist security posture and regenerate segmented emergency seal.
 * TRIPARTITE → DUAL requires 100-char degradation justification.
 */
export async function saveSecurityPostureConfig(
  nextPosture: string,
  degradationJustification?: string,
): Promise<SaveSecurityPostureResult> {
  if (!isSecurityPosture(nextPosture)) {
    return { ok: false, error: "Invalid security posture." };
  }

  try {
    await requireSystemOwnerSession();
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Unauthorized." };
  }

  const current = await getSecurityPostureConfig();
  const isDowngrade =
    current.posture === SECURITY_POSTURE_TRIPARTITE_LOCK &&
    nextPosture === SECURITY_POSTURE_DUAL_LOCK;

  if (isDowngrade) {
    return {
      ok: false,
      error:
        "TRIPARTITE → DUAL requires Board-Level Approval (CEO, CFO, CIO keys) and a 24-hour cool-down. Use Initiate Board Downgrade.",
      requiresBoardLevelApproval: true,
    };
  }

  const pending = await readPostureDegradationWorkflow();
  if (pending) {
    return {
      ok: false,
      error: "Cannot change posture while an administrative downgrade is pending.",
    };
  }

  const seal = await generateNewEmergencySeal(nextPosture);
  const distributionHint =
    nextPosture === SECURITY_POSTURE_TRIPARTITE_LOCK
      ? "Distribute 22-char Vault segment to secret store, 21-char CISO segment to CISO, 21-char Staff segment to operations lead."
      : "Distribute 32-char Vault segment to secret store, 32-char Human segment to SYSTEM_OWNER.";

  return {
    ok: true,
    posture: nextPosture,
    sealGeneratedAt: seal.generatedAt,
    distributionHint,
  };
}
