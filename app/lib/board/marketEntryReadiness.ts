import "server-only";

import prisma from "@/lib/prisma";

import { readGoldenPathLedgerSync } from "@/app/lib/board/goldenPathLedger";
import {
  ACTIVE_PROSPECT_MIN_SCORE,
  isNonAuthenticProspect,
} from "@/app/lib/board/marketProspectAuthenticityMirror";

export const MARKET_ENTRY_GATE_BLOCKERS = [
  "BILLING_STATUS_PENDING",
  "BILLING_STATUS_PAST_DUE",
  "GOLDEN_PATH_NOT_CERTIFIED",
  "EXPORT_ENTITLEMENT_BLOCKED",
] as const;

export type MarketEntryGateBlocker = (typeof MARKET_ENTRY_GATE_BLOCKERS)[number];

export type RegistrationPosture = "sales-assisted-pilot" | "self-serve-registration";

export type MarketEntryReadiness = {
  goldenPathConsecutivePasses: number;
  currentRunId: string | null;
  lastExecutedStop: string | null;
  gateBlockers: MarketEntryGateBlocker[];
  activeScopeFreeze: boolean;
  registrationPosture: RegistrationPosture;
  ingestedLiveProspectsCount: number;
  telemetryEmittedAt: string;
  ledgerSource: string;
};

const GOLDEN_PATH_PASS_BAR = 3;

export function resolveRegistrationPosture(): RegistrationPosture {
  const enabled =
    process.env.IRONFRAME_PUBLIC_REGISTRATION_ENABLED?.trim().toLowerCase() === "true";
  return enabled ? "self-serve-registration" : "sales-assisted-pilot";
}

async function countIngestedLiveProspects(): Promise<number> {
  const rows = await prisma.marketProspect.findMany({
    where: {
      dealStage: { not: "REJECTED" },
      aiFitnessScore: { gte: ACTIVE_PROSPECT_MIN_SCORE },
    },
    select: {
      companyName: true,
      domain: true,
      employeeCount: true,
      region: true,
    },
  });
  return rows.filter((row) => !isNonAuthenticProspect(row)).length;
}

async function resolveLiveGateBlockers(tenantSlug: string | null): Promise<MarketEntryGateBlocker[]> {
  const blockers: MarketEntryGateBlocker[] = [];
  const slug = tenantSlug?.trim().toLowerCase();
  if (slug) {
    const billing = await prisma.tenantBilling.findUnique({
      where: { tenantSlug: slug },
      select: { status: true },
    });
    const status = billing?.status?.trim().toUpperCase() ?? "";
    if (status === "PENDING") blockers.push("BILLING_STATUS_PENDING");
    if (status === "PAST_DUE") blockers.push("BILLING_STATUS_PAST_DUE");
  }
  return blockers;
}

/**
 * Deterministic market-entry certification ledger for IronBoard (:8082).
 * Golden Path run progress: storage/constitutional/golden-path-ledger.json
 * Live gate blockers + prospect count: Postgres at emit time.
 */
export async function buildMarketEntryReadiness(input: {
  tenantSlug?: string | null;
}): Promise<MarketEntryReadiness> {
  const ledger = readGoldenPathLedgerSync();
  const consecutivePasses = ledger.goldenPathConsecutivePasses;
  const liveBlockers = await resolveLiveGateBlockers(input.tenantSlug ?? null);
  const gateBlockers = [...liveBlockers];

  if (consecutivePasses < GOLDEN_PATH_PASS_BAR && !gateBlockers.includes("GOLDEN_PATH_NOT_CERTIFIED")) {
    gateBlockers.push("GOLDEN_PATH_NOT_CERTIFIED");
  }

  if (
    liveBlockers.includes("BILLING_STATUS_PENDING") &&
    !gateBlockers.includes("EXPORT_ENTITLEMENT_BLOCKED")
  ) {
    gateBlockers.push("EXPORT_ENTITLEMENT_BLOCKED");
  }

  const ingestedLiveProspectsCount = await countIngestedLiveProspects();

  return {
    goldenPathConsecutivePasses: consecutivePasses,
    currentRunId: ledger.activeRun?.runId ?? null,
    lastExecutedStop: ledger.activeRun?.lastExecutedStop ?? null,
    gateBlockers,
    activeScopeFreeze: consecutivePasses < GOLDEN_PATH_PASS_BAR,
    registrationPosture: resolveRegistrationPosture(),
    ingestedLiveProspectsCount,
    telemetryEmittedAt: new Date().toISOString(),
    ledgerSource: "storage/constitutional/golden-path-ledger.json",
  };
}
