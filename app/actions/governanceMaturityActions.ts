"use server";

import { getActiveTenantUuidFromCookies } from "@/app/utils/serverTenantContext";
import {
  readGovernanceMaturityState,
  type GovernanceMaturityState,
} from "@/app/lib/governanceMaturityState";
import { recalculateSystemMaturityScore } from "@/app/services/governanceScoring";

export type GovernanceMaturityDto = GovernanceMaturityState & {
  tenantId: string | null;
};

export async function getGovernanceMaturityAction(): Promise<GovernanceMaturityDto> {
  const tenantId = await getActiveTenantUuidFromCookies();
  const state = await readGovernanceMaturityState();
  return { ...state, tenantId };
}

export async function refreshGovernanceMaturityAction(): Promise<GovernanceMaturityDto> {
  const tenantId = await getActiveTenantUuidFromCookies();
  const state = await recalculateSystemMaturityScore({
    tenantId: tenantId ?? undefined,
    trigger: "MANUAL_REFRESH",
  });
  return { ...state, tenantId };
}
