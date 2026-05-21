"use server";

import { getActiveTenantUuidFromCookies } from "@/app/utils/serverTenantContext";
import {
  evaluateSystemTriage,
  type SystemHealthAssessment,
  type SystemTriageResult,
  type TriageIncidentZone,
} from "@/src/services/irontech/triageRouter";
import { normalizeTriageIncidentZone } from "@/app/config/tasHealthTriage";

export type { TriageIncidentZone };

export type EvaluateSystemTriageActionInput = {
  tenantId?: string;
  threadId: string;
  healthBarPercent: number;
  incidentZone: TriageIncidentZone | string;
};

/**
 * Server action — Op Support / Command Post health bar → Irontech triage (TAS §4.3).
 */
export async function evaluateSystemTriageAction(
  input: EvaluateSystemTriageActionInput,
): Promise<SystemTriageResult> {
  const tenantId = input.tenantId?.trim() || (await getActiveTenantUuidFromCookies());
  const assessment: SystemHealthAssessment = {
    tenantId,
    threadId: input.threadId.trim(),
    healthBarPercent: input.healthBarPercent,
    incidentZone: normalizeTriageIncidentZone(input.incidentZone),
  };
  return evaluateSystemTriage(assessment);
}
