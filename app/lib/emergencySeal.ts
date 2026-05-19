import "server-only";

import { createHash, randomBytes } from "crypto";
import type { Prisma } from "@prisma/client";
import { SecurityPosture } from "@prisma/client";
import prisma from "@/lib/prisma";
import {
  SECURITY_POSTURE_DUAL_LOCK,
  SECURITY_POSTURE_TRIPARTITE_LOCK,
  type SecurityPosture as SecurityPostureConfig,
} from "@/app/config/securityPosture";
import {
  resetNuclearOverrideSpentState,
  writeActiveMasterSealMeta,
} from "@/app/lib/constitutionalNuclearOverrideState";

export type EmergencySealSegments = {
  vault: string;
  human?: string;
  ciso?: string;
  staff?: string;
};

export type EmergencySealRecord = {
  posture: SecurityPostureConfig;
  generatedAt: string;
  /** SHA-256 hex of the full 64-char master seal (one-time spend anchor). */
  masterSha256: string;
  segments: EmergencySealSegments;
};

const SEGMENT_LENGTHS = {
  DUAL_LOCK: { vault: 32, human: 32 },
  TRIPARTITE_LOCK: { vault: 22, ciso: 21, staff: 21 },
} as const;

function normalizeHexSegment(value: string, expectedLen: number): string | null {
  const v = value.trim().toLowerCase();
  if (!new RegExp(`^[a-f0-9]{${expectedLen}}$`).test(v)) return null;
  return v;
}

/** Generate cryptographically random 64-char hex master seal. */
export function generateMasterEmergencySealHex(): string {
  return randomBytes(32).toString("hex");
}

export function splitMasterSealForPosture(
  masterHex: string,
  posture: SecurityPostureConfig,
): EmergencySealSegments | null {
  const master = masterHex.trim().toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(master)) return null;

  if (posture === SECURITY_POSTURE_DUAL_LOCK) {
    return {
      vault: master.slice(0, 32),
      human: master.slice(32, 64),
    };
  }
  return {
    vault: master.slice(0, 22),
    ciso: master.slice(22, 43),
    staff: master.slice(43, 64),
  };
}

export function composeMasterSealFromSegments(
  posture: SecurityPostureConfig,
  segments: EmergencySealSegments,
): string | null {
  if (posture === SECURITY_POSTURE_DUAL_LOCK) {
    const vault = normalizeHexSegment(segments.vault, SEGMENT_LENGTHS.DUAL_LOCK.vault);
    const human = normalizeHexSegment(segments.human ?? "", SEGMENT_LENGTHS.DUAL_LOCK.human);
    if (!vault || !human) return null;
    return `${vault}${human}`;
  }
  const vault = normalizeHexSegment(segments.vault, SEGMENT_LENGTHS.TRIPARTITE_LOCK.vault);
  const ciso = normalizeHexSegment(segments.ciso ?? "", SEGMENT_LENGTHS.TRIPARTITE_LOCK.ciso);
  const staff = normalizeHexSegment(segments.staff ?? "", SEGMENT_LENGTHS.TRIPARTITE_LOCK.staff);
  if (!vault || !ciso || !staff) return null;
  return `${vault}${ciso}${staff}`;
}

function parseEmergencySealJson(raw: unknown): EmergencySealRecord | null {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const posture = o.posture;
  if (posture !== SECURITY_POSTURE_DUAL_LOCK && posture !== SECURITY_POSTURE_TRIPARTITE_LOCK) {
    return null;
  }
  const segments = o.segments;
  if (segments == null || typeof segments !== "object" || Array.isArray(segments)) return null;
  const s = segments as Record<string, unknown>;
  const vault = typeof s.vault === "string" ? s.vault : "";
  if (!vault) return null;
  const record: EmergencySealRecord = {
    posture,
    generatedAt: typeof o.generatedAt === "string" ? o.generatedAt : new Date().toISOString(),
    masterSha256: typeof o.masterSha256 === "string" ? o.masterSha256 : "",
    segments: {
      vault,
      human: typeof s.human === "string" ? s.human : undefined,
      ciso: typeof s.ciso === "string" ? s.ciso : undefined,
      staff: typeof s.staff === "string" ? s.staff : undefined,
    },
  };
  const composed = composeMasterSealFromSegments(record.posture, record.segments);
  if (!composed) return null;
  if (!record.masterSha256) {
    record.masterSha256 = createHash("sha256").update(composed, "utf8").digest("hex");
  }
  return record;
}

export async function getEmergencySealRecord(): Promise<EmergencySealRecord | null> {
  try {
    const row = await prisma.systemConfig.findUnique({
      where: { id: "global" },
      select: { emergencySeal: true, securityPosture: true },
    });
    if (!row?.emergencySeal) return null;
    const parsed = parseEmergencySealJson(row.emergencySeal);
    if (parsed) return parsed;
    return null;
  } catch {
    return null;
  }
}

export function getSegmentLengthsForPosture(posture: SecurityPostureConfig): Record<string, number> {
  return posture === SECURITY_POSTURE_TRIPARTITE_LOCK
    ? { ...SEGMENT_LENGTHS.TRIPARTITE_LOCK }
    : { ...SEGMENT_LENGTHS.DUAL_LOCK };
}

/**
 * Regenerate segmented emergency seal and persist to SystemConfig.
 * Resets one-time spent flag so the new master seal can be used once.
 */
export async function generateNewEmergencySeal(
  posture: SecurityPostureConfig,
): Promise<EmergencySealRecord> {
  const master = generateMasterEmergencySealHex();
  const segments = splitMasterSealForPosture(master, posture);
  if (!segments) {
    throw new Error("Failed to split emergency seal for posture.");
  }
  const record: EmergencySealRecord = {
    posture,
    generatedAt: new Date().toISOString(),
    masterSha256: createHash("sha256").update(master, "utf8").digest("hex"),
    segments,
  };

  const prismaPosture =
    posture === SECURITY_POSTURE_TRIPARTITE_LOCK
      ? SecurityPosture.TRIPARTITE_LOCK
      : SecurityPosture.DUAL_LOCK;

  await prisma.systemConfig.upsert({
    where: { id: "global" },
    create: {
      id: "global",
      securityPosture: prismaPosture,
      emergencySeal: record as unknown as Prisma.InputJsonValue,
    },
    update: {
      securityPosture: prismaPosture,
      emergencySeal: record as unknown as Prisma.InputJsonValue,
    },
  });

  resetNuclearOverrideSpentState();
  writeActiveMasterSealMeta(record.masterSha256);
  return record;
}

export type EmergencySealPublicDescriptor = {
  posture: SecurityPostureConfig;
  segmentLengths: Record<string, number>;
  labels: { vault: string; second?: string; third?: string };
  generatedAt: string | null;
};

export async function getEmergencySealPublicDescriptor(): Promise<EmergencySealPublicDescriptor> {
  try {
    const row = await prisma.systemConfig.findUnique({
      where: { id: "global" },
      select: { securityPosture: true, emergencySeal: true },
    });
    const posture: SecurityPostureConfig =
      row?.securityPosture === SecurityPosture.TRIPARTITE_LOCK
        ? SECURITY_POSTURE_TRIPARTITE_LOCK
        : SECURITY_POSTURE_DUAL_LOCK;
    const seal = parseEmergencySealJson(row?.emergencySeal ?? null);
    if (posture === SECURITY_POSTURE_TRIPARTITE_LOCK) {
      return {
        posture,
        segmentLengths: SEGMENT_LENGTHS.TRIPARTITE_LOCK,
        labels: { vault: "Vault / Secret Store", second: "CISO", third: "Staff" },
        generatedAt: seal?.generatedAt ?? null,
      };
    }
    return {
      posture,
      segmentLengths: SEGMENT_LENGTHS.DUAL_LOCK,
      labels: { vault: "Vault / Secret Store", second: "Human (SYSTEM_OWNER)" },
      generatedAt: seal?.generatedAt ?? null,
    };
  } catch {
    return {
      posture: SECURITY_POSTURE_DUAL_LOCK,
      segmentLengths: SEGMENT_LENGTHS.DUAL_LOCK,
      labels: { vault: "Vault / Secret Store", second: "Human (SYSTEM_OWNER)" },
      generatedAt: null,
    };
  }
}
