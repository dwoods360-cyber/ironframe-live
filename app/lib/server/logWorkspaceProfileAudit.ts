import { auditLogCreateLoose } from "@/lib/auditLogLoose";

export async function logWorkspaceProfileAudit(input: {
  tenantUuid: string;
  operatorId: string;
  action: "WORKSPACE_ALE_BASELINE_UPDATED" | "WORKSPACE_COMPANY_PROFILE_UPDATED";
  summary: string;
}): Promise<void> {
  await auditLogCreateLoose({
    data: {
      action: input.action,
      justification: input.summary,
      operatorId: input.operatorId,
      tenantId: input.tenantUuid,
      isSimulation: false,
    },
  });
}
