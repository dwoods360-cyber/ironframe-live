"use server";

import { getActiveTenantUuidFromCookies } from "@/app/utils/serverTenantContext";
import { readComplianceDriftState } from "@/app/lib/complianceDriftState";
import { readSimulatedAuditState } from "@/app/lib/simulatedAuditState";
import { buildGovernanceComparisonMatrix } from "@/app/services/regulatoryIngestion";
import { getLatestComparisonWithDiffs } from "@/app/services/regulatoryPipeline";
import { runSimulatedAudit } from "@/app/services/simulatedAudit";
import { recalculateSystemMaturityScore } from "@/app/services/governanceScoring";
import type { SimulatedAuditReport } from "@/app/types/simulatedAudit";

export async function runSimulatedAuditAction(
  alertId: string,
  amendmentMarkdown: string,
): Promise<
  | { ok: true; report: SimulatedAuditReport }
  | { ok: false; error: string }
> {
  const tenantId = await getActiveTenantUuidFromCookies();
  if (!tenantId) return { ok: false, error: "No active tenant." };
  if (!amendmentMarkdown.trim()) {
    return { ok: false, error: "Generate a TAS amendment before running simulated audit." };
  }

  const drift = await readComplianceDriftState();
  const alert = drift.alerts.find((a) => a.id === alertId);
  if (!alert) return { ok: false, error: "Drift alert not found." };

  const report = await runSimulatedAudit({
    alertId,
    amendmentMarkdown: amendmentMarkdown.trim(),
    tenantId,
    tasSection: alert.tasSection,
  });

  await recalculateSystemMaturityScore({
    tenantId,
    trigger: "IRONTALLY_SIMULATED_AUDIT",
  });

  return { ok: true, report };
}

export async function getGovernanceComparisonAction() {
  const matrix = await buildGovernanceComparisonMatrix();
  const diffSnapshot = await getLatestComparisonWithDiffs();
  return { ...matrix, diffSnapshot, diffRows: diffSnapshot?.diffRows ?? [] };
}

export async function getSimulatedAuditStateAction() {
  return readSimulatedAuditState();
}
