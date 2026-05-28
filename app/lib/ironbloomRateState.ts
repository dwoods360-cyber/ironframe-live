import "server-only";

import prisma from "@/lib/prisma";
import type { PhysicalUnitType, UtilityRateQuote } from "@/app/types/ironbloomGridcore";
import { TENANT_UUIDS, tenantKeyFromUuid, type TenantKey } from "@/app/utils/tenantIsolation";

export const IRONBLOOM_RATE_POLL_INTERVAL_MS = 30 * 24 * 60 * 60 * 1000;
export const IRONBLOOM_RATE_DRIFT_THRESHOLD = 0.15;

export type CachedTenantRate = {
  tenantKey: string;
  quote: UtilityRateQuote;
  lastPolledAt: string;
};

export type IronbloomRateDriftAlertRecord = {
  id: string;
  tenantKey: string;
  sentAt: string;
  previousRateUsd: number;
  newRateUsd: number;
  driftRatio: number;
  unitType: PhysicalUnitType;
  pulseMessage: string;
};

export type IronbloomRateState = {
  lastGlobalPollAt: string | null;
  rates: CachedTenantRate[];
  alerts: IronbloomRateDriftAlertRecord[];
};

const DEFAULT_STATE: IronbloomRateState = {
  lastGlobalPollAt: null,
  rates: [],
  alerts: [],
};

async function fetchExistingTenantIds(candidateTenantIds: string[]): Promise<Set<string>> {
  if (candidateTenantIds.length === 0) return new Set<string>();
  const rows = await prisma.tenant.findMany({
    where: { id: { in: candidateTenantIds } },
    select: { id: true },
  });
  return new Set(rows.map((row) => row.id));
}

function resolveTenantId(tenantKey: string): string {
  const tenantId = TENANT_UUIDS[tenantKey as TenantKey];
  if (!tenantId) {
    throw new Error(`IRONBLOOM: unknown tenantKey "${tenantKey}" — cannot resolve tenant_id UUID.`);
  }
  return tenantId;
}

function mapCacheRowToCachedTenantRate(row: {
  tenantId: string;
  rateUsdPerUnit: number;
  unitType: string;
  source: string;
  jurisdiction: string;
  polledAt: Date;
  lastPolledAt: Date;
}): CachedTenantRate | null {
  const tenantKey = tenantKeyFromUuid(row.tenantId);
  if (!tenantKey) return null;
  const quote: UtilityRateQuote = {
    rateUsdPerUnit: row.rateUsdPerUnit,
    unitType: row.unitType as PhysicalUnitType,
    source: row.source as UtilityRateQuote["source"],
    jurisdiction: row.jurisdiction,
    polledAt: row.polledAt.toISOString(),
  };
  return {
    tenantKey,
    quote,
    lastPolledAt: row.lastPolledAt.toISOString(),
  };
}

function mapAlertRowToRecord(row: {
  tenantId: string;
  id: string;
  sentAt: Date;
  previousRateUsd: number;
  newRateUsd: number;
  driftRatio: number;
  unitType: string;
  pulseMessage: string;
}): IronbloomRateDriftAlertRecord | null {
  const tenantKey = tenantKeyFromUuid(row.tenantId);
  if (!tenantKey) return null;
  return {
    id: row.id,
    tenantKey,
    sentAt: row.sentAt.toISOString(),
    previousRateUsd: row.previousRateUsd,
    newRateUsd: row.newRateUsd,
    driftRatio: row.driftRatio,
    unitType: row.unitType as PhysicalUnitType,
    pulseMessage: row.pulseMessage,
  };
}

export async function readUtilityRateCache(tenantKey: string) {
  const tenantId = resolveTenantId(tenantKey);
  return prisma.ironbloomUtilityRateCache.findUnique({ where: { tenantId } });
}

export async function upsertUtilityRateCache(
  tenantKey: string,
  data: {
    rateUsdPerUnit: number;
    unitType: PhysicalUnitType;
    source: string;
    jurisdiction: string;
    polledAt: Date;
    lastPolledAt: Date;
  },
) {
  const tenantId = resolveTenantId(tenantKey);
  const existing = await fetchExistingTenantIds([tenantId]);
  if (!existing.has(tenantId)) return null;
  return prisma.ironbloomUtilityRateCache.upsert({
    where: { tenantId },
    update: data,
    create: { tenantId, ...data },
  });
}

export async function appendRateDriftAlert(
  tenantKey: string,
  alert: Omit<IronbloomRateDriftAlertRecord, "tenantKey">,
) {
  const tenantId = resolveTenantId(tenantKey);
  const existing = await fetchExistingTenantIds([tenantId]);
  if (!existing.has(tenantId)) return null;
  return prisma.ironbloomRateDriftAlert.create({
    data: {
      tenantId,
      id: alert.id,
      sentAt: new Date(alert.sentAt),
      previousRateUsd: alert.previousRateUsd,
      newRateUsd: alert.newRateUsd,
      driftRatio: alert.driftRatio,
      unitType: alert.unitType,
      pulseMessage: alert.pulseMessage,
    },
  });
}

export async function readIronbloomRateState(): Promise<IronbloomRateState> {
  const [cacheRows, alertRows, syncMetaRows] = await Promise.all([
    prisma.ironbloomUtilityRateCache.findMany(),
    prisma.ironbloomRateDriftAlert.findMany({
      orderBy: { sentAt: "desc" },
      take: 50,
    }),
    prisma.ironbloomTenantSyncMeta.findMany({
      where: { lastGlobalPollAt: { not: null } },
      orderBy: { lastGlobalPollAt: "desc" },
      take: 1,
      select: { lastGlobalPollAt: true },
    }),
  ]);

  const rates = cacheRows
    .map(mapCacheRowToCachedTenantRate)
    .filter((row): row is CachedTenantRate => row != null);

  const alerts = alertRows
    .map(mapAlertRowToRecord)
    .filter((row): row is IronbloomRateDriftAlertRecord => row != null);

  const lastGlobalPollAt = syncMetaRows[0]?.lastGlobalPollAt?.toISOString() ?? null;

  return { lastGlobalPollAt, rates, alerts };
}

/**
 * @deprecated Postgres-backed — use {@link readIronbloomRateState} instead.
 */
export function readIronbloomRateStateSync(): IronbloomRateState {
  throw new Error(
    "readIronbloomRateStateSync() is unavailable: Ironbloom utility rates persist in Postgres. Use readIronbloomRateState().",
  );
}

export async function writeIronbloomRateState(next: IronbloomRateState): Promise<void> {
  const lastGlobalPollAt = next.lastGlobalPollAt ? new Date(next.lastGlobalPollAt) : null;
  const targetTenantIds = Object.values(TENANT_UUIDS);
  const existingTenantIds = await fetchExistingTenantIds(targetTenantIds);

  for (const cached of next.rates) {
    const tenantId = resolveTenantId(cached.tenantKey);
    if (!existingTenantIds.has(tenantId)) continue;
    const polledAt = new Date(cached.quote.polledAt);
    const lastPolledAt = new Date(cached.lastPolledAt);
    await prisma.ironbloomUtilityRateCache.upsert({
      where: { tenantId },
      update: {
        rateUsdPerUnit: cached.quote.rateUsdPerUnit,
        unitType: cached.quote.unitType,
        source: cached.quote.source,
        jurisdiction: cached.quote.jurisdiction,
        polledAt,
        lastPolledAt,
      },
      create: {
        tenantId,
        rateUsdPerUnit: cached.quote.rateUsdPerUnit,
        unitType: cached.quote.unitType,
        source: cached.quote.source,
        jurisdiction: cached.quote.jurisdiction,
        polledAt,
        lastPolledAt,
      },
    });
  }

  for (const alert of next.alerts) {
    const tenantId = resolveTenantId(alert.tenantKey);
    if (!existingTenantIds.has(tenantId)) continue;
    await prisma.ironbloomRateDriftAlert.upsert({
      where: { tenantId_id: { tenantId, id: alert.id } },
      update: {
        sentAt: new Date(alert.sentAt),
        previousRateUsd: alert.previousRateUsd,
        newRateUsd: alert.newRateUsd,
        driftRatio: alert.driftRatio,
        unitType: alert.unitType,
        pulseMessage: alert.pulseMessage,
      },
      create: {
        tenantId,
        id: alert.id,
        sentAt: new Date(alert.sentAt),
        previousRateUsd: alert.previousRateUsd,
        newRateUsd: alert.newRateUsd,
        driftRatio: alert.driftRatio,
        unitType: alert.unitType,
        pulseMessage: alert.pulseMessage,
      },
    });
  }

  if (lastGlobalPollAt) {
    const tenantIds = [...existingTenantIds];
    await Promise.all(
      tenantIds.map((tenantId) =>
        prisma.ironbloomTenantSyncMeta.upsert({
          where: { tenantId },
          update: { lastGlobalPollAt },
          create: { tenantId, lastGlobalPollAt },
        }),
      ),
    );
  }
}

export function getCachedRateForTenant(
  state: IronbloomRateState,
  tenantKey: string,
): CachedTenantRate | undefined {
  return state.rates.find((r) => r.tenantKey === tenantKey);
}

export function isRatePollDue(state: IronbloomRateState, now = Date.now()): boolean {
  if (!state.lastGlobalPollAt) return true;
  const last = Date.parse(state.lastGlobalPollAt);
  if (!Number.isFinite(last)) return true;
  return now - last >= IRONBLOOM_RATE_POLL_INTERVAL_MS;
}
