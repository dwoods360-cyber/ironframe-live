import "server-only";

import prisma from "@/lib/prisma";
import { tenantKeyFromElectricityMapZone } from "@/app/config/tenantCarbonZones";
import { TENANT_UUIDS } from "@/app/utils/tenantIsolation";

/** Physical-only grid coefficient row (no monetary fields — Ironbloom isolation boundary). */
export type GridcoreCarbonCoefficientRecord = {
  zone: string;
  carbonIntensityGrams: string;
  carbonIntensityGco2PerKwh: number;
  renewablePercentage: number | null;
  source: string;
  polledAt: string;
  telemetryFingerprint: string;
};

export type GridcoreCarbonLedgerState = {
  lastSynchronizedAt: string | null;
  coefficients: GridcoreCarbonCoefficientRecord[];
};

function resolveTenantIdForZone(zone: string): string | null {
  const tenantKey = tenantKeyFromElectricityMapZone(zone);
  if (!tenantKey) return null;
  return TENANT_UUIDS[tenantKey] ?? null;
}

function mapRowToCoefficient(row: {
  zone: string;
  carbonIntensityGrams: bigint;
  carbonIntensityGco2PerKwh: number;
  renewablePercentage: number | null;
  source: string;
  polledAt: Date;
  telemetryFingerprint: string;
}): GridcoreCarbonCoefficientRecord {
  return {
    zone: row.zone,
    carbonIntensityGrams: row.carbonIntensityGrams.toString(),
    carbonIntensityGco2PerKwh: row.carbonIntensityGco2PerKwh,
    renewablePercentage: row.renewablePercentage,
    source: row.source,
    polledAt: row.polledAt.toISOString(),
    telemetryFingerprint: row.telemetryFingerprint,
  };
}

export async function readGridcoreCarbonLedgerState(): Promise<GridcoreCarbonLedgerState> {
  const [coefficientRows, syncMetaRows] = await Promise.all([
    prisma.gridcoreCarbonCoefficient.findMany({ orderBy: { zone: "asc" } }),
    prisma.ironbloomTenantSyncMeta.findMany({
      where: { lastSynchronizedAt: { not: null } },
      orderBy: { lastSynchronizedAt: "desc" },
      take: 1,
      select: { lastSynchronizedAt: true },
    }),
  ]);

  return {
    lastSynchronizedAt: syncMetaRows[0]?.lastSynchronizedAt?.toISOString() ?? null,
    coefficients: coefficientRows.map(mapRowToCoefficient),
  };
}

/**
 * @deprecated Postgres-backed — use {@link readGridcoreCarbonLedgerState} instead.
 */
export function readGridcoreCarbonLedgerStateSync(): GridcoreCarbonLedgerState {
  throw new Error(
    "readGridcoreCarbonLedgerStateSync() is unavailable: Gridcore carbon ledger persists in Postgres. Use readGridcoreCarbonLedgerState().",
  );
}

export async function writeGridcoreCarbonLedgerState(next: GridcoreCarbonLedgerState): Promise<void> {
  const lastSynchronizedAt = next.lastSynchronizedAt ? new Date(next.lastSynchronizedAt) : null;
  const touchedTenantIds = new Set<string>();

  for (const coefficient of next.coefficients) {
    const tenantId = resolveTenantIdForZone(coefficient.zone);
    if (!tenantId) continue;

    touchedTenantIds.add(tenantId);
    const polledAt = new Date(coefficient.polledAt);

    await prisma.gridcoreCarbonCoefficient.upsert({
      where: { tenantId_zone: { tenantId, zone: coefficient.zone } },
      update: {
        carbonIntensityGrams: BigInt(coefficient.carbonIntensityGrams),
        carbonIntensityGco2PerKwh: coefficient.carbonIntensityGco2PerKwh,
        renewablePercentage: coefficient.renewablePercentage,
        source: coefficient.source,
        polledAt,
        telemetryFingerprint: coefficient.telemetryFingerprint,
      },
      create: {
        tenantId,
        zone: coefficient.zone,
        carbonIntensityGrams: BigInt(coefficient.carbonIntensityGrams),
        carbonIntensityGco2PerKwh: coefficient.carbonIntensityGco2PerKwh,
        renewablePercentage: coefficient.renewablePercentage,
        source: coefficient.source,
        polledAt,
        telemetryFingerprint: coefficient.telemetryFingerprint,
      },
    });
  }

  if (lastSynchronizedAt) {
    const tenantIds =
      touchedTenantIds.size > 0 ? [...touchedTenantIds] : Object.values(TENANT_UUIDS);
    await Promise.all(
      tenantIds.map((tenantId) =>
        prisma.ironbloomTenantSyncMeta.upsert({
          where: { tenantId },
          update: { lastSynchronizedAt },
          create: { tenantId, lastSynchronizedAt },
        }),
      ),
    );
  }
}
