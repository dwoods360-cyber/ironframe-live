"use server";

import { getActiveTenantUuidFromCookies } from "@/app/utils/serverTenantContext";
import { readGovernanceMaturityState } from "@/app/lib/governanceMaturityState";
import { buildIrontallyFrameworkSnapshot } from "@/app/services/irontallyMapper";
import { buildIrontallyComplianceReadinessPdfBytes } from "@/app/utils/irontallyComplianceReadinessPdf";
import { compileFrameworkReadiness } from "@/src/services/compliance/irontallyEngine";

export async function getFrameworkReadinessAction() {
  const tenantId = await getActiveTenantUuidFromCookies();
  if (!tenantId) return { ok: false as const, error: "No active tenant." };
  const readiness = await compileFrameworkReadiness(tenantId);
  return { ok: true as const, readiness };
}

export async function getIrontallyFrameworkSnapshotAction() {
  const state = await readGovernanceMaturityState();
  return buildIrontallyFrameworkSnapshot(state.current.score, state.current.calculatedAt);
}

export async function downloadComplianceReadinessPdfAction(): Promise<
  | { ok: true; base64Pdf: string; filename: string }
  | { ok: false; error: string }
> {
  const tenantId = await getActiveTenantUuidFromCookies();
  if (!tenantId) return { ok: false, error: "No active tenant." };

  const snapshot = await getIrontallyFrameworkSnapshotAction();
  const bytes = buildIrontallyComplianceReadinessPdfBytes(snapshot);
  const base64Pdf = Buffer.from(bytes).toString("base64");
  const date = snapshot.asOf.slice(0, 10);
  return {
    ok: true,
    base64Pdf,
    filename: `irontally-compliance-readiness-${date}.pdf`,
  };
}
