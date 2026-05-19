import "server-only";

import { extractRequiredDaysFromRegulation } from "@/app/config/tasConstitutionalObligations";
import { readLatestIrontechPostMortemForTenant } from "@/app/services/irontechPostMortem";
import { TENANT_UUIDS } from "@/app/utils/tenantIsolation";
import type { RequirementBlock, ShadowAuditVerdict } from "@/app/types/regulatoryIngestion";

const IRONCAST_CYCLE_DAYS = 45;

/**
 * Shadow audit — would Constitutional Collapse simulation fail under new regulation?
 */
export function runShadowAuditForRegulation(params: {
  regulationId: string;
  blocks: RequirementBlock[];
  tenantId?: string;
}): ShadowAuditVerdict {
  const tenantId = params.tenantId?.trim() || TENANT_UUIDS.medshield;
  const postMortem = readLatestIrontechPostMortemForTenant(tenantId);
  const corpus = params.blocks.map((b) => `${b.title}\n${b.body}`).join("\n\n");

  const requiredDays = extractRequiredDaysFromRegulation(corpus);
  const breachNotificationGapDays =
    requiredDays != null && requiredDays < IRONCAST_CYCLE_DAYS
      ? IRONCAST_CYCLE_DAYS - requiredDays
      : null;

  const wouldFail =
    breachNotificationGapDays != null &&
    breachNotificationGapDays > 0 &&
    /breach|notification|reg\s*s-?p|safeguard/i.test(corpus);

  const narrative = wouldFail
    ? `Shadow audit: latest ${postMortem?.scenario ?? "CONSTITUTIONAL_COLLAPSE"} post-mortem would FAIL the new ` +
      `${requiredDays}-day notification rule — Ironcast (Agent 7) 45-day cycle exceeds SEC requirement by ${breachNotificationGapDays} days.`
    : `Shadow audit: Constitutional Collapse simulation remains compatible with ingested regulation (${params.blocks.length} blocks analyzed).`;

  return {
    regulationId: params.regulationId,
    wouldFailChaosSimulation: wouldFail,
    narrative,
    chaosScenario: postMortem?.scenario ?? "CONSTITUTIONAL_COLLAPSE",
    breachNotificationGapDays,
  };
}
