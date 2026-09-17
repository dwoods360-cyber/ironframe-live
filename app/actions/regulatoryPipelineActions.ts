"use server";

import { runIndustryScoutWorker } from "@/app/services/ironsight/crawler";
import { runIronscribeDriveSync } from "@/app/services/ironscribe/driveSync";
import { getLatestComparisonWithDiffs } from "@/app/services/regulatoryPipeline";
import { readRegulatoryIngestionState } from "@/app/lib/regulatoryIngestionState";
import { generateTasAmendmentAction } from "@/app/actions/complianceDriftActions";
import { buildGovernanceComparisonMatrix } from "@/app/services/regulatoryIngestion";
import { getActiveTenantUuidFromCookies } from "@/app/utils/serverTenantContext";

export async function runIndustryScoutAction() {
  const tenantId = await getActiveTenantUuidFromCookies();
  if (!tenantId) {
    throw new Error("IRONGUARD_SESSION_TENANT_UUID_REQUIRED");
  }
  const scout = await runIndustryScoutWorker({ tenantId });
  const drive = await runIronscribeDriveSync();
  return { scout, drive };
}

export async function getGovernanceComparisonWithDiffsAction() {
  const matrix = await buildGovernanceComparisonMatrix();
  const diffSnapshot = await getLatestComparisonWithDiffs();
  const ingestionState = await readRegulatoryIngestionState();
  return {
    ...matrix,
    diffSnapshot,
    diffRows: diffSnapshot?.diffRows ?? [],
    cisoNotifications: ingestionState.cisoNotifications.slice(0, 10),
    lastScoutRunAt: ingestionState.lastScoutRunAt,
  };
}

/** 1-click amendment from comparison dashboard (CISO critical drift). */
export async function oneClickAmendmentFromDriftAction(alertId: string) {
  return generateTasAmendmentAction(alertId);
}

export async function getRegulatoryIngestionStatusAction() {
  return readRegulatoryIngestionState();
}
