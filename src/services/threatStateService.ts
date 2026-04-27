import { createHash } from "crypto";
import { EventSource, ThreatState, type Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import {
  GRC_RESOLUTION_GATE_ADMIN_BYPASS_DETAIL,
  MANUAL_BOARD_PURGE_FOR_TEST_BASELINE_REASON,
} from "@/src/constants/grcManualPurge";
import { integrityService } from "@/src/services/integrityService";

const GRC_PROTOCOL_VIOLATION =
  "GRC_PROTOCOL_VIOLATION: Missing approved attestation or evidence artifact.";

function stableSerialize(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((v) => stableSerialize(v)).join(",")}]`;
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableSerialize(obj[k])}`).join(",")}}`;
}

function payloadHashFromChanges(changes: Prisma.ThreatEventUpdateInput): string {
  return createHash("sha256").update(stableSerialize(changes)).digest("hex");
}

export async function updateThreatWithIntegrity<T>(args: {
  threatId: string;
  changes: Prisma.ThreatEventUpdateInput;
  actorUserId: string;
  eventType: string;
  source?: EventSource;
  tx?: any;
  select?: Prisma.ThreatEventSelect;
  /** Merged into Bank Vault payload (e.g. admin resolution gate bypass). */
  ledgerPayloadExtras?: Record<string, unknown>;
}): Promise<T> {
  const client: any = args.tx ?? prisma;
  const scope = await client.threatEvent.findUnique({
    where: { id: args.threatId },
    select: { id: true, tenantCompanyId: true, status: true },
  });
  if (!scope?.tenantCompanyId) {
    throw new Error(`THREAT_NOT_FOUND: ${args.threatId}`);
  }
  const company = await client.company.findUnique({
    where: { id: scope.tenantCompanyId },
    select: { tenantId: true },
  });
  if (!company?.tenantId) {
    throw new Error(`TENANT_NOT_FOUND_FOR_THREAT: ${args.threatId}`);
  }

  const payloadHash = payloadHashFromChanges(args.changes);
  const execute = async (tx: any) => {
    const updated = await tx.threatEvent.update({
      where: { id: args.threatId },
      data: args.changes,
      ...(args.select ? { select: args.select } : {}),
    });
    await integrityService.logEvent(tx as Prisma.TransactionClient, {
      tenantId: company.tenantId,
      eventType: args.eventType,
      entityType: "THREAT_EVENT",
      entityId: args.threatId,
      actorUserId: args.actorUserId,
      source: args.source ?? EventSource.SYSTEM,
      payload: {
        fromStatus: scope.status,
        toStatus: (args.changes.status as ThreatState | undefined) ?? scope.status,
        changes: args.changes,
        payloadHash,
        ...(args.ledgerPayloadExtras ?? {}),
      },
    });
    return updated as T;
  };

  if (args.tx) {
    return execute(args.tx);
  }
  return prisma.$transaction(async (tx) => execute(tx));
}

export async function transitionThreatStatus<T>(args: {
  threatId: string;
  newStatus: ThreatState;
  approvalId?: string | null;
  actorUserId: string;
  eventType?: string;
  source?: EventSource;
  tx?: any;
  select?: Prisma.ThreatEventSelect;
  extraChanges?: Prisma.ThreatEventUpdateInput;
  /**
   * When transitioning to `RESOLVED`, matching {@link MANUAL_BOARD_PURGE_FOR_TEST_BASELINE_REASON}
   * skips approved-resolution + linked-approval checks (simulation baseline reset only).
   */
  reason?: string | null;
}): Promise<T> {
  const client: any = args.tx ?? prisma;
  let resolvedApprovalId: string | null = args.approvalId ?? null;
  let ledgerPayloadExtras: Record<string, unknown> | undefined;

  if (args.newStatus === ThreatState.RESOLVED) {
    const adminPurgeBypass =
      args.reason === MANUAL_BOARD_PURGE_FOR_TEST_BASELINE_REASON;

    if (adminPurgeBypass) {
      ledgerPayloadExtras = {
        grcResolutionGateBypassed: true,
        grcResolutionGateBypassDetail: GRC_RESOLUTION_GATE_ADMIN_BYPASS_DETAIL,
        grcResolutionBypassReason: args.reason,
      };
    } else {
      const gateThreat = await client.threatEvent.findUnique({
        where: { id: args.threatId },
        select: { id: true, tenantCompanyId: true, resolutionApprovalId: true },
      });
      const approvalCandidate = resolvedApprovalId ?? gateThreat?.resolutionApprovalId ?? null;
      if (!gateThreat?.tenantCompanyId || !approvalCandidate) {
        throw new Error(GRC_PROTOCOL_VIOLATION);
      }
      const company = await client.company.findUnique({
        where: { id: gateThreat.tenantCompanyId },
        select: { tenantId: true },
      });
      const approval = await client.threatApproval.findUnique({
        where: { id: approvalCandidate },
        select: { id: true, status: true, tenantId: true, threatId: true },
      });
      if (
        !company?.tenantId ||
        !approval ||
        approval.status !== "APPROVED" ||
        approval.threatId !== args.threatId ||
        approval.tenantId !== company.tenantId
      ) {
        throw new Error(GRC_PROTOCOL_VIOLATION);
      }
      resolvedApprovalId = approval.id;
    }
  }

  const data: Prisma.ThreatEventUpdateInput = {
    ...(args.extraChanges ?? {}),
    status: args.newStatus,
    ...(resolvedApprovalId ? { resolutionApprovalId: resolvedApprovalId } : {}),
  };

  return updateThreatWithIntegrity<T>({
    threatId: args.threatId,
    changes: data,
    actorUserId: args.actorUserId,
    eventType: args.eventType ?? "THREAT_STATUS_TRANSITION",
    source: args.source ?? EventSource.SYSTEM,
    tx: args.tx,
    select: args.select,
    ledgerPayloadExtras,
  });
}
