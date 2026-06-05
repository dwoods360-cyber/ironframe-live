import { logThreatActivity } from "@/app/actions/auditActions";
import { CHAOS_DIRECTIVE } from "@/app/config/chaosShadowAudit";

/**
 * Immutable compliance-timeline row — persisted to `AuditLog` (server) for Audit Intelligence / GRC feed.
 */
export async function writeChaosL4ComplianceTimelineTransaction(args: {
  plane: "prod" | "shadow";
  threatId: string;
  workPerformed: string;
  closedAt: string;
}): Promise<void> {
  const payload = JSON.stringify({
    event: "COMPLIANCE_TIMELINE_TRANSACTION",
    directiveId: CHAOS_DIRECTIVE.T12_SYSTEM_CONCLUSION,
    integrityEventType: "CHAOS_L4_TECH_WORK_RESOLVED",
    lifecycleStep: "CLOSED_ARCHIVED",
    assignedRole: "IRONFRAME_TECH_SUPPORT",
    workPerformedSummary: args.workPerformed,
    closedAt: args.closedAt,
    immutable: true,
  });

  await logThreatActivity(
    args.plane === "shadow" ? null : args.threatId,
    "GRC_PROCESS_THREAT",
    payload,
    {
      operatorId: "IRONFRAME_TECH_SUPPORT",
      isSimulation: args.plane === "shadow",
      simThreatId: args.plane === "shadow" ? args.threatId : null,
    },
  );
}
