import "server-only";

import { createHash } from "crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { auditLogCreateLoose } from "@/lib/auditLogLoose";
import { sendLastWillAndTestament, resolveLwtLingerMs } from "@/app/lib/lastWillAndTestament";
import { performHardWipe } from "@/app/lib/scorchProtocol";

export const DMS_TRIGGERED_ACTION = "DMS_TRIGGERED";
export const DMS_FATAL_MESSAGE =
  "[FATAL] — DMS_TRIGGERED — Scorched Earth Protocol engaged. System state purged.";

export const DEAD_MAN_SWITCH_TTL_MS_DEFAULT = 24 * 60 * 60 * 1000;

/** Chaos `CONSTITUTIONAL_COLLAPSE` — compressed DMS window (4 minutes). */
export const DEAD_MAN_SWITCH_SIMULATION_TTL_MS = 240_000;

export function resolveDeadManSwitchTtlMs(record?: Pick<DeadManSwitchRecord, "isSimulation">): number {
  if (record?.isSimulation) return DEAD_MAN_SWITCH_SIMULATION_TTL_MS;
  const hours = Number(process.env.DEAD_MAN_SWITCH_TTL_HOURS);
  if (Number.isFinite(hours) && hours > 0) return Math.floor(hours * 60 * 60 * 1000);
  return DEAD_MAN_SWITCH_TTL_MS_DEFAULT;
}

export type DeadManSwitchRecord = {
  armedAt: string;
  expiresAt: string;
  triggerTenantId?: string;
  isSimulation?: boolean;
  resolvedAt?: string;
  resolutionSignature?: string;
  triggeredAt?: string;
  lwtSentAt?: string;
  lwtArchiveId?: string;
};

export type ArmDeadManSwitchOptions = {
  isSimulation?: boolean;
  /** Replace an existing armed record (chaos re-trigger). */
  forceRearm?: boolean;
};

const STATE_DIR = join(process.cwd(), "storage", "constitutional");
const STATE_FILE = join(STATE_DIR, "dead-man-switch.json");

function parseRecord(raw: unknown): DeadManSwitchRecord | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.armedAt !== "string" || typeof o.expiresAt !== "string") return null;
  return {
    armedAt: o.armedAt,
    expiresAt: o.expiresAt,
    triggerTenantId: typeof o.triggerTenantId === "string" ? o.triggerTenantId : undefined,
    resolvedAt: typeof o.resolvedAt === "string" ? o.resolvedAt : undefined,
    resolutionSignature: typeof o.resolutionSignature === "string" ? o.resolutionSignature : undefined,
    triggeredAt: typeof o.triggeredAt === "string" ? o.triggeredAt : undefined,
    lwtSentAt: typeof o.lwtSentAt === "string" ? o.lwtSentAt : undefined,
    lwtArchiveId: typeof o.lwtArchiveId === "string" ? o.lwtArchiveId : undefined,
    isSimulation: o.isSimulation === true,
  };
}

function readFileRecord(): DeadManSwitchRecord | null {
  try {
    if (!existsSync(STATE_FILE)) return null;
    return parseRecord(JSON.parse(readFileSync(STATE_FILE, "utf8")));
  } catch {
    return null;
  }
}

function writeFileRecord(record: DeadManSwitchRecord | null): void {
  if (!existsSync(STATE_DIR)) mkdirSync(STATE_DIR, { recursive: true });
  if (!record) {
    if (existsSync(STATE_FILE)) writeFileSync(STATE_FILE, "{}", "utf8");
    return;
  }
  writeFileSync(STATE_FILE, JSON.stringify(record, null, 2), "utf8");
}

export async function readDeadManSwitch(): Promise<DeadManSwitchRecord | null> {
  try {
    const row = await prisma.systemConfig.findUnique({
      where: { id: "global" },
      select: { deadManSwitch: true },
    });
    const parsed = parseRecord(row?.deadManSwitch ?? null);
    if (parsed) return parsed;
  } catch {
    /* migration pending */
  }
  return readFileRecord();
}

async function writeDeadManSwitch(record: DeadManSwitchRecord | null): Promise<void> {
  writeFileRecord(record);
  try {
    await prisma.systemConfig.upsert({
      where: { id: "global" },
      create: {
        id: "global",
        deadManSwitch: (record ?? null) as unknown as Prisma.InputJsonValue,
      },
      update: {
        deadManSwitch: (record ?? null) as unknown as Prisma.InputJsonValue,
      },
    });
  } catch {
    /* file fallback */
  }
}

export function buildResolutionSignature(constitutionalHash: string): string {
  return createHash("sha256")
    .update(`RESOLUTION_SIGNATURE:${constitutionalHash.trim().toLowerCase()}`, "utf8")
    .digest("hex");
}

export async function armDeadManSwitchOnEmergency(
  triggerTenantId?: string | null,
  options?: ArmDeadManSwitchOptions,
): Promise<DeadManSwitchRecord> {
  const existing = await readDeadManSwitch();
  if (
    existing &&
    !options?.forceRearm &&
    !existing.resolutionSignature &&
    !existing.triggeredAt
  ) {
    if (options?.isSimulation && !existing.isSimulation) {
      /* fall through — upgrade to simulation TTL */
    } else if (triggerTenantId && !existing.triggerTenantId) {
      const merged = { ...existing, triggerTenantId };
      await writeDeadManSwitch(merged);
      return merged;
    } else if (!options?.isSimulation) {
      return existing;
    }
  }

  const now = Date.now();
  const isSimulation = options?.isSimulation === true;
  const ttl = resolveDeadManSwitchTtlMs({ isSimulation });
  const record: DeadManSwitchRecord = {
    armedAt: new Date(now).toISOString(),
    expiresAt: new Date(now + ttl).toISOString(),
    triggerTenantId: triggerTenantId?.trim() || undefined,
    isSimulation,
  };
  await writeDeadManSwitch(record);
  return record;
}

export async function recordDeadManSwitchResolution(constitutionalHash: string): Promise<void> {
  const existing = await readDeadManSwitch();
  if (!existing) return;
  const signature = buildResolutionSignature(constitutionalHash);
  await writeDeadManSwitch({
    ...existing,
    resolvedAt: new Date().toISOString(),
    resolutionSignature: signature,
  });
}

/** @deprecated Use {@link performHardWipe} for tenant-scoped scorch. */
export async function executeScorchedEarthProtocol(): Promise<{
  sessionsPurged: number;
  agentCacheCleared: number;
  vaultSecretsCleared: number;
}> {
  const record = await readDeadManSwitch();
  const tenantId = record?.triggerTenantId;
  if (!tenantId) {
    return { sessionsPurged: 0, agentCacheCleared: 0, vaultSecretsCleared: 0 };
  }
  const wipe = await performHardWipe(tenantId);
  return {
    sessionsPurged: wipe.sessionsPurged,
    agentCacheCleared: wipe.agentCacheCleared,
    vaultSecretsCleared: wipe.vaultSecretsCleared,
  };
}

async function maybeSendLastWill(record: DeadManSwitchRecord): Promise<DeadManSwitchRecord> {
  if (record.lwtSentAt) return record;
  const expires = Date.parse(record.expiresAt);
  if (!Number.isFinite(expires)) return record;
  const remaining = expires - Date.now();
  if (remaining > resolveLwtLingerMs()) return record;

  const sent = await sendLastWillAndTestament(record.triggerTenantId ?? null, {
    isSimulation: record.isSimulation === true,
  });
  const next: DeadManSwitchRecord = {
    ...record,
    lwtSentAt: new Date().toISOString(),
    lwtArchiveId: sent.archiveId,
  };
  await writeDeadManSwitch(next);
  return next;
}

export async function checkAndExecuteDeadMansSwitch(
  isConstitutionalEmergency: boolean,
  triggerTenantId?: string | null,
): Promise<boolean> {
  if (!isConstitutionalEmergency) {
    return false;
  }

  let record = await readDeadManSwitch();
  if (!record) {
    record = await armDeadManSwitchOnEmergency(triggerTenantId);
  } else if (triggerTenantId && !record.triggerTenantId) {
    record = { ...record, triggerTenantId };
    await writeDeadManSwitch(record);
  }

  if (record.resolutionSignature || record.triggeredAt) {
    return Boolean(record.triggeredAt);
  }

  record = await maybeSendLastWill(record);

  const expires = Date.parse(record.expiresAt);
  if (!Number.isFinite(expires) || Date.now() < expires) {
    return false;
  }

  const tenantId = record.triggerTenantId;
  if (!tenantId) {
    console.error("[DMS] No triggerTenantId — aborting scorch to protect global config.");
    return false;
  }

  await performHardWipe(tenantId);

  try {
    await auditLogCreateLoose({
      data: {
        action: DMS_TRIGGERED_ACTION,
        justification: JSON.stringify({
          fatal: DMS_FATAL_MESSAGE,
          triggerTenantId: tenantId,
          lwtArchiveId: record.lwtArchiveId ?? null,
        }),
        operatorId: "SYSTEM_DMS",
        threatId: null,
        isSimulation: record.isSimulation === true,
        governance_tenant_uuid: tenantId,
      },
    });
  } catch (e) {
    console.error("[deadMansSwitch] DMS_TRIGGERED audit failed", e);
  }

  await writeDeadManSwitch({
    ...record,
    triggeredAt: new Date().toISOString(),
  });
  return true;
}

export type DeadManSwitchStatusDto = {
  armed: boolean;
  expiresAt: string | null;
  remainingMs: number | null;
  resolved: boolean;
  triggered: boolean;
  lwtSent: boolean;
  lwtArchiveId: string | null;
  triggerTenantId: string | null;
  isSimulation: boolean;
};

export async function getDeadManSwitchStatus(
  isConstitutionalEmergency: boolean,
  triggerTenantId?: string | null,
): Promise<DeadManSwitchStatusDto> {
  if (!isConstitutionalEmergency) {
    return {
      armed: false,
      expiresAt: null,
      remainingMs: null,
      resolved: false,
      triggered: false,
      lwtSent: false,
      lwtArchiveId: null,
      triggerTenantId: null,
      isSimulation: false,
    };
  }
  const record = (await readDeadManSwitch()) ?? (await armDeadManSwitchOnEmergency(triggerTenantId));
  const expires = Date.parse(record.expiresAt);
  const remainingMs = Number.isFinite(expires) ? Math.max(0, expires - Date.now()) : null;
  return {
    armed: true,
    expiresAt: record.expiresAt,
    remainingMs,
    resolved: Boolean(record.resolutionSignature),
    triggered: Boolean(record.triggeredAt),
    lwtSent: Boolean(record.lwtSentAt),
    lwtArchiveId: record.lwtArchiveId ?? null,
    triggerTenantId: record.triggerTenantId ?? triggerTenantId ?? null,
    isSimulation: record.isSimulation === true,
  };
}
