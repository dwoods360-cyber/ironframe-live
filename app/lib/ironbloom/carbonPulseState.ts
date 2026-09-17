import "server-only";

import { randomUUID } from "crypto";
import type { Prisma } from "@prisma/client";
import { withIronguardTenant } from "@/app/lib/server/ironguardSessionTenant";
import prisma from "@/lib/prisma";

export type CarbonIntensitySample = {
  at: string;
  zone: string;
  gco2PerKwh: number;
  mitigatedValueCents: string;
  dirty: boolean;
};

export type DirtyGridAlertRecord = {
  id: string;
  tenantId: string;
  sentAt: string;
  intensityGco2PerKwh: number;
  thresholdGco2PerKwh: number;
  tenantUsageKwh: number;
  usageBaselineKwh: number;
  message: string;
  acknowledged?: boolean;
  /** Canonical SHA-256 of throttling / dirty-window evidence (gavel anchor for Carbon ROI). */
  evidenceArtifactSha256?: string;
};

export type IronlockThrottleTenantRecord = {
  active: boolean;
  updatedAt: string;
  intensityGco2PerKwh: number;
  thresholdGco2PerKwh: number;
  autonomousMitigationEnabled: boolean;
  /** ISO timestamp of last AUTO_THROTTLE_ENGAGED audit (cool-down). */
  lastAutoThrottleAuditAt?: string;
};

export type CarbonPulseState = {
  samplesByTenant: Record<string, CarbonIntensitySample[]>;
  dirtyGridAlerts: DirtyGridAlertRecord[];
  lastDirtyAlertAtByTenant: Record<string, string>;
  /** Agent 6: background-agent throttle (dirty window + autonomous mitigation). */
  ironlockThrottleByTenant?: Record<string, IronlockThrottleTenantRecord>;
};

export const MAX_SAMPLES_PER_TENANT = 96;

const SAMPLE_RETENTION_MS = 24 * 60 * 60 * 1000;

function mapSampleRow(row: {
  sampledAt: Date;
  zone: string;
  gco2PerKwh: number;
  mitigatedValueCents: bigint;
  dirty: boolean;
}): CarbonIntensitySample {
  return {
    at: row.sampledAt.toISOString(),
    zone: row.zone,
    gco2PerKwh: row.gco2PerKwh,
    mitigatedValueCents: row.mitigatedValueCents.toString(),
    dirty: row.dirty,
  };
}

function mapAlertRow(row: {
  tenantId: string;
  id: string;
  sentAt: Date;
  intensityGco2PerKwh: number;
  thresholdGco2PerKwh: number;
  tenantUsageKwh: number;
  usageBaselineKwh: number;
  message: string;
  acknowledged: boolean;
  evidenceArtifactSha: string | null;
}): DirtyGridAlertRecord {
  return {
    id: row.id,
    tenantId: row.tenantId,
    sentAt: row.sentAt.toISOString(),
    intensityGco2PerKwh: row.intensityGco2PerKwh,
    thresholdGco2PerKwh: row.thresholdGco2PerKwh,
    tenantUsageKwh: row.tenantUsageKwh,
    usageBaselineKwh: row.usageBaselineKwh,
    message: row.message,
    acknowledged: row.acknowledged,
    evidenceArtifactSha256: row.evidenceArtifactSha ?? undefined,
  };
}

function mapThrottleRow(row: {
  tenantId: string;
  active: boolean;
  updatedAt: Date;
  intensityGco2PerKwh: number;
  thresholdGco2PerKwh: number;
  autonomousMitigationEnabled: boolean;
  lastAutoThrottleAuditAt: Date | null;
}): IronlockThrottleTenantRecord {
  return {
    active: row.active,
    updatedAt: row.updatedAt.toISOString(),
    intensityGco2PerKwh: row.intensityGco2PerKwh,
    thresholdGco2PerKwh: row.thresholdGco2PerKwh,
    autonomousMitigationEnabled: row.autonomousMitigationEnabled,
    lastAutoThrottleAuditAt: row.lastAutoThrottleAuditAt?.toISOString(),
  };
}

export async function pruneCarbonSamplesForTenant(tenantId: string): Promise<void> {
  const cutoff = new Date(Date.now() - SAMPLE_RETENTION_MS);
  await withIronguardTenant(tenantId, async (tx) => {
    await tx.carbonPulseSample.deleteMany({
      where: { tenantId, sampledAt: { lt: cutoff } },
    });

    const ordered = await tx.carbonPulseSample.findMany({
      where: { tenantId },
      orderBy: { sampledAt: "desc" },
      select: { tenantId: true, id: true },
    });

    if (ordered.length <= MAX_SAMPLES_PER_TENANT) return;

    const excess = ordered.slice(MAX_SAMPLES_PER_TENANT);
    await Promise.all(
      excess.map((row) =>
        tx.carbonPulseSample.delete({
          where: { tenantId_id: { tenantId: row.tenantId, id: row.id } },
        }),
      ),
    );
  });
}

export async function appendCarbonSampleToStore(
  tenantId: string,
  sample: CarbonIntensitySample,
): Promise<void> {
  await withIronguardTenant(tenantId, (tx) =>
    tx.carbonPulseSample.create({
      data: {
        tenantId,
        id: randomUUID(),
        sampledAt: new Date(sample.at),
        zone: sample.zone,
        gco2PerKwh: sample.gco2PerKwh,
        mitigatedValueCents: BigInt(sample.mitigatedValueCents || "0"),
        dirty: sample.dirty,
      },
    }),
  );
  await pruneCarbonSamplesForTenant(tenantId);
}

export async function readCarbonPulseStateForTenant(tenantId: string): Promise<CarbonIntensitySample[]> {
  const rows = await withIronguardTenant(tenantId, (tx) =>
    tx.carbonPulseSample.findMany({
      where: { tenantId },
      orderBy: { sampledAt: "asc" },
    }),
  );
  return rows.map(mapSampleRow);
}

export async function listDirtyGridAlertsForTenant(tenantId: string): Promise<DirtyGridAlertRecord[]> {
  const rows = await withIronguardTenant(tenantId, (tx) =>
    tx.dirtyGridAlert.findMany({
      where: { tenantId },
      orderBy: { sentAt: "desc" },
      take: 100,
    }),
  );
  return rows.map(mapAlertRow);
}

export async function countAcknowledgedDirtyGridAlerts(tenantId: string): Promise<number> {
  return withIronguardTenant(tenantId, (tx) =>
    tx.dirtyGridAlert.count({
      where: { tenantId, acknowledged: true },
    }),
  );
}

async function readCarbonPulseBundleInTx(
  tenantId: string,
  tx: Prisma.TransactionClient,
): Promise<CarbonPulseState> {
  const [sampleRows, alertRows, throttleRow, syncMeta] = await Promise.all([
    tx.carbonPulseSample.findMany({
      where: { tenantId },
      orderBy: { sampledAt: "asc" },
    }),
    tx.dirtyGridAlert.findMany({
      where: { tenantId },
      orderBy: { sentAt: "desc" },
      take: 100,
    }),
    tx.ironlockCarbonThrottle.findUnique({ where: { tenantId } }),
    tx.ironbloomTenantSyncMeta.findUnique({ where: { tenantId } }),
  ]);

  return {
    samplesByTenant: { [tenantId]: sampleRows.map(mapSampleRow) },
    dirtyGridAlerts: alertRows.map(mapAlertRow),
    lastDirtyAlertAtByTenant: syncMeta?.lastDirtyAlertAtByTenant
      ? { [tenantId]: syncMeta.lastDirtyAlertAtByTenant.toISOString() }
      : {},
    ironlockThrottleByTenant: throttleRow
      ? { [tenantId]: mapThrottleRow(throttleRow) }
      : {},
  };
}

/** Tenant-scoped Carbon Pulse slice for read-modify-write workers. */
export async function readCarbonPulseStateForTenantBundle(tenantId: string): Promise<CarbonPulseState> {
  return withIronguardTenant(tenantId, (tx) => readCarbonPulseBundleInTx(tenantId, tx));
}

/**
 * Catalog-iterated aggregator. `tenants` is not RLS-scoped; each ledger read binds first.
 */
export async function readCarbonPulseState(): Promise<CarbonPulseState> {
  const tenantRows = await prisma.tenant.findMany({
    select: { id: true },
    orderBy: { id: "asc" },
  });

  const samplesByTenant: Record<string, CarbonIntensitySample[]> = {};
  const dirtyGridAlerts: DirtyGridAlertRecord[] = [];
  const lastDirtyAlertAtByTenant: Record<string, string> = {};
  const ironlockThrottleByTenant: Record<string, IronlockThrottleTenantRecord> = {};

  for (const { id: tenantId } of tenantRows) {
    const slice = await withIronguardTenant(tenantId, (tx) => readCarbonPulseBundleInTx(tenantId, tx));
    samplesByTenant[tenantId] = slice.samplesByTenant[tenantId] ?? [];
    dirtyGridAlerts.push(...slice.dirtyGridAlerts);
    Object.assign(lastDirtyAlertAtByTenant, slice.lastDirtyAlertAtByTenant);
    Object.assign(ironlockThrottleByTenant, slice.ironlockThrottleByTenant);
  }

  dirtyGridAlerts.sort((a, b) => Date.parse(b.sentAt) - Date.parse(a.sentAt));
  return {
    samplesByTenant,
    dirtyGridAlerts: dirtyGridAlerts.slice(0, 100),
    lastDirtyAlertAtByTenant,
    ironlockThrottleByTenant,
  };
}

/**
 * @deprecated Postgres-backed — use {@link readCarbonPulseState} instead.
 */
export function readCarbonPulseStateSync(): CarbonPulseState {
  throw new Error(
    "readCarbonPulseStateSync() is unavailable: Carbon pulse telemetry persists in Postgres. Use readCarbonPulseState().",
  );
}

async function replaceTenantSamples(tenantId: string, samples: CarbonIntensitySample[]): Promise<void> {
  const pruned = pruneSamplesOlderThan24h(samples).slice(-MAX_SAMPLES_PER_TENANT);
  await withIronguardTenant(tenantId, async (tx) => {
    await tx.carbonPulseSample.deleteMany({ where: { tenantId } });
    if (pruned.length === 0) return;
    await tx.carbonPulseSample.createMany({
      data: pruned.map((sample) => ({
        tenantId,
        id: randomUUID(),
        sampledAt: new Date(sample.at),
        zone: sample.zone,
        gco2PerKwh: sample.gco2PerKwh,
        mitigatedValueCents: BigInt(sample.mitigatedValueCents || "0"),
        dirty: sample.dirty,
      })),
    });
  });
}

export async function writeCarbonPulseState(next: CarbonPulseState): Promise<void> {
  const tenantIds = new Set<string>([
    ...Object.keys(next.samplesByTenant),
    ...next.dirtyGridAlerts.map((a) => a.tenantId),
    ...Object.keys(next.ironlockThrottleByTenant ?? {}),
    ...Object.keys(next.lastDirtyAlertAtByTenant),
  ]);
  const existingTenantRows =
    tenantIds.size > 0
      ? await prisma.tenant.findMany({
          where: { id: { in: [...tenantIds] } },
          select: { id: true },
        })
      : [];
  const existingTenantIds = new Set(existingTenantRows.map((row) => row.id));

  await Promise.all(
    [...existingTenantIds].map((tenantId) =>
      replaceTenantSamples(tenantId, next.samplesByTenant[tenantId] ?? []),
    ),
  );

  for (const alert of next.dirtyGridAlerts) {
    if (!existingTenantIds.has(alert.tenantId)) continue;
    await withIronguardTenant(alert.tenantId, (tx) =>
      tx.dirtyGridAlert.upsert({
        where: { tenantId_id: { tenantId: alert.tenantId, id: alert.id } },
        update: {
          sentAt: new Date(alert.sentAt),
          intensityGco2PerKwh: alert.intensityGco2PerKwh,
          thresholdGco2PerKwh: alert.thresholdGco2PerKwh,
          tenantUsageKwh: alert.tenantUsageKwh,
          usageBaselineKwh: alert.usageBaselineKwh,
          message: alert.message,
          acknowledged: alert.acknowledged ?? false,
          evidenceArtifactSha: alert.evidenceArtifactSha256 ?? null,
        },
        create: {
          tenantId: alert.tenantId,
          id: alert.id,
          sentAt: new Date(alert.sentAt),
          intensityGco2PerKwh: alert.intensityGco2PerKwh,
          thresholdGco2PerKwh: alert.thresholdGco2PerKwh,
          tenantUsageKwh: alert.tenantUsageKwh,
          usageBaselineKwh: alert.usageBaselineKwh,
          message: alert.message,
          acknowledged: alert.acknowledged ?? false,
          evidenceArtifactSha: alert.evidenceArtifactSha256 ?? null,
        },
      }),
    );
  }

  for (const [tenantId, record] of Object.entries(next.ironlockThrottleByTenant ?? {})) {
    if (!existingTenantIds.has(tenantId)) continue;
    await withIronguardTenant(tenantId, (tx) =>
      tx.ironlockCarbonThrottle.upsert({
        where: { tenantId },
        update: {
          active: record.active,
          updatedAt: new Date(record.updatedAt),
          intensityGco2PerKwh: record.intensityGco2PerKwh,
          thresholdGco2PerKwh: record.thresholdGco2PerKwh,
          autonomousMitigationEnabled: record.autonomousMitigationEnabled,
          lastAutoThrottleAuditAt: record.lastAutoThrottleAuditAt
            ? new Date(record.lastAutoThrottleAuditAt)
            : null,
        },
        create: {
          tenantId,
          active: record.active,
          updatedAt: new Date(record.updatedAt),
          intensityGco2PerKwh: record.intensityGco2PerKwh,
          thresholdGco2PerKwh: record.thresholdGco2PerKwh,
          autonomousMitigationEnabled: record.autonomousMitigationEnabled,
          lastAutoThrottleAuditAt: record.lastAutoThrottleAuditAt
            ? new Date(record.lastAutoThrottleAuditAt)
            : null,
        },
      }),
    );
  }

  await Promise.all(
    Object.entries(next.lastDirtyAlertAtByTenant).map(([tenantId, sentAt]) =>
      existingTenantIds.has(tenantId)
        ? withIronguardTenant(tenantId, (tx) =>
            tx.ironbloomTenantSyncMeta.upsert({
              where: { tenantId },
              update: { lastDirtyAlertAtByTenant: new Date(sentAt) },
              create: { tenantId, lastDirtyAlertAtByTenant: new Date(sentAt) },
            }),
          )
        : Promise.resolve(),
    ),
  );
}

/** In-memory merge helper for read-modify-write flows within a single request. */
export function appendCarbonSample(
  state: CarbonPulseState,
  tenantId: string,
  sample: CarbonIntensitySample,
): CarbonPulseState {
  const prev = state.samplesByTenant[tenantId] ?? [];
  const next = [...prev, sample].slice(-MAX_SAMPLES_PER_TENANT);
  return {
    ...state,
    samplesByTenant: { ...state.samplesByTenant, [tenantId]: next },
  };
}

export function pruneSamplesOlderThan24h(samples: CarbonIntensitySample[]): CarbonIntensitySample[] {
  const cutoff = Date.now() - SAMPLE_RETENTION_MS;
  return samples.filter((s) => Date.parse(s.at) >= cutoff);
}
