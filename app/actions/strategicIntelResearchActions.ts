"use server";

import {
  getIndustryProfileResearchContext,
  loadStrategicIntelForBoardReport as loadStrategicIntelForBoardReportFromStore,
} from "@/lib/strategicIntel/strategicIntelResearchStore";
import type { IndustryProfileResearchContext } from "@/lib/strategicIntel/strategicIntelResearchShared";
import { resolveBoardOrgTenantId } from "@/lib/strategicIntel/boardOrgTenant";
import { isVerifiedActiveTenantUuid } from "@/app/utils/secureTerminalGate";

export async function fetchIndustryProfileResearchContext(
  tenantUuid: string | null | undefined,
  industryLabel: string,
): Promise<IndustryProfileResearchContext | null> {
  const tenantId = isVerifiedActiveTenantUuid(tenantUuid)
    ? tenantUuid
    : resolveBoardOrgTenantId();
  return getIndustryProfileResearchContext(tenantId, industryLabel);
}

/** Server-only board report loader — re-exported for lib callers (not client bundles). */
export async function loadStrategicIntelForBoardReport() {
  return loadStrategicIntelForBoardReportFromStore();
}
