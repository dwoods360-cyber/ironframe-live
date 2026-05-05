"use server";

import { revalidatePath } from "next/cache";
import { unstable_noStore as noStore } from "next/cache";
import prisma from "@/lib/prisma";
import { ThreatState, DeAckReason, type Prisma } from "@prisma/client";
import type { DigitalReceiptThreatScalars } from "@/app/lib/grc/threatReceipt";
import {
  buildDigitalReceiptDocument,
  shadowReceiptAuditStub,
  toReceiptThreatScalars,
} from "@/app/lib/grc/threatReceipt";
import { loadAuditTailForDigitalReceipt } from "@/app/lib/grc/receiptAuditQueries";
import {
  DISPOSITION_STATUS_ESCALATED,
  DISPOSITION_STATUS_FALSE_POSITIVE,
  DISPOSITION_STATUS_PASSED,
} from "@/app/lib/grc/dispositionConstants";
import {
  getCompanyIdForActiveTenant,
  resolveClearanceThreatForActiveTenant,
  resolveThreatForReceiptForActiveTenant,
  type ClearanceThreatRow,
} from "@/app/lib/grc/clearanceThreatResolve";
import { readSimulationPlaneEnabled } from "@/app/lib/security/ingressGateway";
import {
  mergeIngestionDetailsPatch,
  mergeIngestionDetailsPatchJson,
  normalizeIngestionDetailsToString,
} from "@/app/utils/ingestionDetailsMerge";
import { parseIrongateScanFromIngestionDetails } from "@/app/utils/irongateScan";
import { getSupabaseSessionUser, resolveDispositionOperatorId } from "@/app/utils/serverAuth";
import { CLEARANCE_QUEUE_STATUSES } from "@/app/utils/clearanceQueue";
import { dispatchIronlockQuarantineAutoEscalation } from "@/app/utils/ironlockQuarantineAutoEscalation";
import { updateThreatWithIntegrity } from "@/src/services/threatStateService";
import { cookies } from "next/headers";
import { recordResilienceIntelStreamLine } from "@/app/actions/resilienceIntelStreamActions";
import { USER_CLEARANCE_COOKIE_NAME, normalizeClearanceLevel } from "@/app/utils/clearanceLogic";

const DMZ_PROMOTE_GRC_JUSTIFICATION = "Cleared and Promoted via DMZ Quarantine";

const DMZ_REJECT_WORK_NOTE = "[DMZ QUARANTINE: REJECTED] Threat archived as False Positive.";

const DMZ_ESCALATE_WORK_NOTE = "[DMZ QUARANTINE: ESCALATED] Threat escalated directly to SecOps.";

function threatScalarsForHash(
  row: ClearanceThreatRow,
  patch: Partial<DigitalReceiptThreatScalars>,
): DigitalReceiptThreatScalars {
  const s = toReceiptThreatScalars(row, patch);
  return { ...s, receiptHash: null };
}

async function updateClearanceThreatRow(
  mode: "sim" | "prod",
  threatId: string,
  data: Prisma.ThreatEventUncheckedUpdateInput | Prisma.RiskEventUncheckedUpdateInput,
): Promise<void> {
  if (mode === "sim") {
    await prisma.riskEvent.update({
      where: { id: threatId },
      data: data as Prisma.RiskEventUncheckedUpdateInput,
      select: { id: true },
    });
    return;
  }
  await updateThreatWithIntegrity({
    threatId,
    changes: data as Prisma.ThreatEventUpdateInput,
    actorUserId: "clearance-operator",
    eventType: "CLEARANCE_ROW_UPDATED",
    select: { id: true },
  });
}

function computeIrongateVerdict(threat: {
  id: string;
  title: string;
  sourceAgent: string;
}): "CLEAN" | "MALICIOUS" {
  const haystack = `${threat.title} ${threat.sourceAgent}`.toUpperCase();
  if (
    /QUARANTINED|IRONLOCK|EXTERNAL_INJECTION|HOSTILE|MALICIOUS|EXTERNAL_INJECTION_ATTEMPT/i.test(
      haystack,
    )
  ) {
    return "MALICIOUS";
  }
  let sum = 0;
  for (let i = 0; i < threat.id.length; i++) {
    sum += threat.id.charCodeAt(i);
  }
  return sum % 3 === 0 ? "MALICIOUS" : "CLEAN";
}

export type IrongateScanPayload = {
  status: "CLEAN" | "MALICIOUS";
  scannedAt: string;
};

export type RunIrongateSanitizationResult =
  | { success: true; irongateScan: IrongateScanPayload }
  | { success: false; error: string };

/**
 * DMZ autonomous sanitization: merge `irongateScan` into `ingestionDetails` (no schema migration).
 * Respects simulation cookie: updates SimThreatEvent vs ThreatEvent.
 */
export async function runIrongateSanitization(
  threatId: string,
): Promise<RunIrongateSanitizationResult> {
  try {
    const { threat, tenantUuid, mode } = await resolveClearanceThreatForActiveTenant(threatId);
    const existing = parseIrongateScanFromIngestionDetails(threat.ingestionDetails ?? null);
    if (existing?.status === "CLEAN" || existing?.status === "MALICIOUS") {
      return {
        success: true,
        irongateScan: {
          status: existing.status,
          scannedAt: existing.scannedAt ?? new Date().toISOString(),
        },
      };
    }
    const status = computeIrongateVerdict(threat);
    const scannedAt = new Date().toISOString();
    const irongateScanJson: Prisma.InputJsonValue = { status, scannedAt };
    const merged =
      mode === "sim"
        ? mergeIngestionDetailsPatchJson(threat.ingestionDetails ?? null, {
            irongateScan: irongateScanJson,
          })
        : mergeIngestionDetailsPatch(threat.ingestionDetails ?? null, {
            irongateScan: irongateScanJson,
          });
    const previousStatus = threat.status;
    const data: Prisma.RiskEventUncheckedUpdateInput | Prisma.ThreatEventUncheckedUpdateInput = {
      ingestionDetails: merged,
      ...(status === "MALICIOUS" ? { status: ThreatState.MITIGATED } : {}),
    };
    await updateClearanceThreatRow(mode, threatId, data);
    if (status === "MALICIOUS" && previousStatus !== ThreatState.MITIGATED) {
      void dispatchIronlockQuarantineAutoEscalation({
        threatId,
        tenantUuid,
        previousStatus,
      });
    }
    revalidatePath("/admin/clearance");
    revalidatePath("/opsupport");
    return { success: true, irongateScan: { status, scannedAt } };
  } catch (error) {
    console.error("[clearanceActions] runIrongateSanitization:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function getPendingThreatActivityLogsForClearance() {
  try {
    const companyId = await getCompanyIdForActiveTenant();
    if (companyId == null) {
      return { success: true as const, logs: [] };
    }
    const simPlane = await readSimulationPlaneEnabled();
    const clearanceQuery = {
      where: {
        status: { in: CLEARANCE_QUEUE_STATUSES },
        tenantCompanyId: companyId,
      },
      orderBy: { createdAt: "desc" as const },
      take: 50,
      select: {
        id: true,
        title: true,
        sourceAgent: true,
        createdAt: true,
        ingestionDetails: true,
        status: true,
        tenantCompanyId: true,
        isFalsePositive: true,
        dispositionStatus: true,
        receiptHash: true,
      },
    };
    const logs = simPlane
      ? await prisma.riskEvent.findMany(clearanceQuery)
      : await prisma.threatEvent.findMany(clearanceQuery);
    return { success: true as const, logs };
  } catch (error) {
    console.error("[clearanceActions] getPendingThreatActivityLogsForClearance:", error);
    return { success: false as const, logs: [], error: String(error) };
  }
}

export type PromoteThreatResult =
  | { success: true; auditId: string; threatId: string }
  | { success: false; error: string };

export async function promoteThreatToSanctum(threatId: string): Promise<PromoteThreatResult> {
  try {
    const operatorId = await resolveDispositionOperatorId();
    const { threat, mode } = await resolveClearanceThreatForActiveTenant(threatId);
    const irongate = parseIrongateScanFromIngestionDetails(threat.ingestionDetails ?? null);
    if (irongate?.status !== "CLEAN") {
      return {
        success: false,
        error:
          irongate?.status === "MALICIOUS"
            ? "Irongate: malicious signature detected — promotion to ledger is blocked."
            : "Irongate: payload not sanitized or verdict missing — CLEAN required before promotion.",
      };
    }
    const promotedIngestionDetails =
      mode === "sim"
        ? mergeIngestionDetailsPatchJson(threat.ingestionDetails ?? null, {
            grcJustification: DMZ_PROMOTE_GRC_JUSTIFICATION,
          })
        : mergeIngestionDetailsPatch(threat.ingestionDetails ?? null, {
            grcJustification: DMZ_PROMOTE_GRC_JUSTIFICATION,
          });

    const promotedDetails =
      mode === "sim"
        ? JSON.stringify({
            ...shadowReceiptAuditStub(threat.id),
            kind: "CLEARANCE_PROMOTED",
            sourceAgent: threat.sourceAgent,
            ingestion: threat.ingestionDetails,
          })
        : JSON.stringify({
            source_threat_id: threatId,
            sourceAgent: threat.sourceAgent,
            ingestion: threat.ingestionDetails,
          });

    const promoted = await prisma.auditLog.create({
      data: {
        action: `CLEARANCE_PROMOTED:${threat.sourceAgent}`,
        justification: promotedDetails,
        operatorId,
        threatId: mode === "sim" ? null : threat.id,
        isSimulation: mode === "sim",
      },
    });
    await prisma.auditLog.create({
      data: {
        action: "CHAIN_OF_CUSTODY_TRANSFER",
        justification:
          mode === "sim"
            ? JSON.stringify({
                ...shadowReceiptAuditStub(threat.id),
                kind: "CHAIN_OF_CUSTODY_TRANSFER",
                text: `Promoted pipeline threat ${threatId} from clearance to active ledger (shadow).`,
              })
            : `Promoted pipeline threat ${threatId} from clearance to active ledger.`,
        operatorId,
        threatId: mode === "sim" ? null : threat.id,
        isSimulation: mode === "sim",
      },
    });

    const tail = await loadAuditTailForDigitalReceipt(mode, threat.id);
    const nextScalars = threatScalarsForHash(threat, {
      status: ThreatState.CONFIRMED,
      dispositionStatus: DISPOSITION_STATUS_PASSED,
      isFalsePositive: false,
      deAckReason: null,
      ingestionDetails: normalizeIngestionDetailsToString(promotedIngestionDetails) ?? "",
      updatedAt: new Date().toISOString(),
    });
    const { hash: receiptHash } = buildDigitalReceiptDocument({
      plane: mode === "sim" ? "shadow" : "production",
      goldenSource: mode === "prod",
      threat: nextScalars,
      auditTail: tail,
    });

    await updateClearanceThreatRow(mode, threatId, {
      status: ThreatState.CONFIRMED,
      ingestionDetails: promotedIngestionDetails,
      dispositionStatus: DISPOSITION_STATUS_PASSED,
      isFalsePositive: false,
      deAckReason: null,
      receiptHash,
    });

    const out = { success: true as const, auditId: promoted.id, threatId: threat.id };

    revalidatePath("/admin/clearance");
    revalidatePath("/opsupport");
    revalidatePath("/");
    revalidatePath("/", "layout");

    return out;
  } catch (error) {
    console.error("[clearanceActions] promoteThreatToSanctum:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export type DispositionResult = { success: true } | { success: false; error: string };

export async function rejectAndArchiveThreat(threatId: string): Promise<DispositionResult> {
  try {
    const operatorId = await resolveDispositionOperatorId();
    const { threat, mode } = await resolveClearanceThreatForActiveTenant(threatId);
    const rejectedIngestionDetails =
      mode === "sim"
        ? mergeIngestionDetailsPatchJson(threat.ingestionDetails ?? null, {
            grcJustification: DMZ_REJECT_WORK_NOTE,
          })
        : mergeIngestionDetailsPatch(threat.ingestionDetails ?? null, {
            grcJustification: DMZ_REJECT_WORK_NOTE,
          });

    if (mode === "prod") {
      await prisma.workNote.create({
        data: {
          text: DMZ_REJECT_WORK_NOTE,
          operatorId,
          threatId,
        },
      });
      await prisma.auditLog.create({
        data: {
          action: "CLEARANCE_FALSE_POSITIVE",
          justification: JSON.stringify({
            threatId,
            text: DMZ_REJECT_WORK_NOTE,
          }),
          operatorId,
          threatId,
          isSimulation: false,
        },
      });
    } else {
      await prisma.auditLog.create({
        data: {
          action: "CLEARANCE_FALSE_POSITIVE",
          justification: JSON.stringify({
            ...shadowReceiptAuditStub(threat.id),
            text: DMZ_REJECT_WORK_NOTE,
          }),
          operatorId,
          threatId: null,
          isSimulation: true,
        },
      });
    }

    const tail = await loadAuditTailForDigitalReceipt(mode, threat.id);
    const nextScalars = threatScalarsForHash(threat, {
      status: ThreatState.RESOLVED,
      dispositionStatus: DISPOSITION_STATUS_FALSE_POSITIVE,
      isFalsePositive: true,
      deAckReason: DeAckReason.FALSE_POSITIVE,
      ingestionDetails: normalizeIngestionDetailsToString(rejectedIngestionDetails) ?? "",
      updatedAt: new Date().toISOString(),
    });
    const { hash: receiptHash } = buildDigitalReceiptDocument({
      plane: mode === "sim" ? "shadow" : "production",
      goldenSource: mode === "prod",
      threat: nextScalars,
      auditTail: tail,
    });

    await updateClearanceThreatRow(mode, threatId, {
      status: ThreatState.RESOLVED,
      deAckReason: DeAckReason.FALSE_POSITIVE,
      ingestionDetails: rejectedIngestionDetails,
      dispositionStatus: DISPOSITION_STATUS_FALSE_POSITIVE,
      isFalsePositive: true,
      receiptHash,
    });

    revalidatePath("/admin/clearance");
    revalidatePath("/opsupport");
    revalidatePath("/");
    revalidatePath("/", "layout");
    return { success: true };
  } catch (error) {
    console.error("[clearanceActions] rejectAndArchiveThreat:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function escalateToSecOps(threatId: string): Promise<DispositionResult> {
  try {
    const operatorId = await resolveDispositionOperatorId();
    const { threat, mode } = await resolveClearanceThreatForActiveTenant(threatId);
    const escalatedIngestionDetails =
      mode === "sim"
        ? mergeIngestionDetailsPatchJson(threat.ingestionDetails ?? null, {
            grcJustification: DMZ_ESCALATE_WORK_NOTE,
          })
        : mergeIngestionDetailsPatch(threat.ingestionDetails ?? null, {
            grcJustification: DMZ_ESCALATE_WORK_NOTE,
          });

    if (mode === "prod") {
      await prisma.workNote.create({
        data: {
          text: DMZ_ESCALATE_WORK_NOTE,
          operatorId,
          threatId,
        },
      });
      await prisma.auditLog.create({
        data: {
          action: "CLEARANCE_ESCALATED",
          justification: JSON.stringify({ threatId, text: DMZ_ESCALATE_WORK_NOTE }),
          operatorId,
          threatId,
          isSimulation: false,
        },
      });
    } else {
      await prisma.auditLog.create({
        data: {
          action: "CLEARANCE_ESCALATED",
          justification: JSON.stringify({
            ...shadowReceiptAuditStub(threat.id),
            text: DMZ_ESCALATE_WORK_NOTE,
          }),
          operatorId,
          threatId: null,
          isSimulation: true,
        },
      });
    }

    const tail = await loadAuditTailForDigitalReceipt(mode, threat.id);
    const nextScalars = threatScalarsForHash(threat, {
      status: ThreatState.CONFIRMED,
      dispositionStatus: DISPOSITION_STATUS_ESCALATED,
      ingestionDetails: normalizeIngestionDetailsToString(escalatedIngestionDetails) ?? "",
      updatedAt: new Date().toISOString(),
    });
    const { hash: receiptHash } = buildDigitalReceiptDocument({
      plane: mode === "sim" ? "shadow" : "production",
      goldenSource: mode === "prod",
      threat: nextScalars,
      auditTail: tail,
    });

    await updateClearanceThreatRow(mode, threatId, {
      status: ThreatState.CONFIRMED,
      ingestionDetails: escalatedIngestionDetails,
      dispositionStatus: DISPOSITION_STATUS_ESCALATED,
      receiptHash,
    });

    revalidatePath("/admin/clearance");
    revalidatePath("/opsupport");
    revalidatePath("/");
    revalidatePath("/", "layout");
    return { success: true };
  } catch (error) {
    console.error("[clearanceActions] escalateToSecOps:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/** One-shot Pass: Irongate merge (if needed) then promotion to ACTIVE + receipt anchor. */
export async function passClearanceDispositionAction(
  threatId: string,
): Promise<PromoteThreatResult> {
  const sanitized = await runIrongateSanitization(threatId);
  if (!sanitized.success) {
    return { success: false, error: sanitized.error };
  }
  if (sanitized.irongateScan.status !== "CLEAN") {
    return {
      success: false,
      error:
        "Pass requires a CLEAN Irongate verdict. Malicious or quarantined payloads cannot be passed.",
    };
  }
  return promoteThreatToSanctum(threatId);
}

export async function falsePositiveClearanceDispositionAction(
  threatId: string,
): Promise<DispositionResult> {
  return rejectAndArchiveThreat(threatId);
}

export type DigitalReceiptActionResult =
  | {
      success: true;
      plane: "production" | "shadow";
      goldenSource: boolean;
      receiptJson: string;
      rowReceiptHash: string | null;
    }
  | { success: false; error: string };

export async function getThreatDigitalReceiptAction(
  threatId: string,
): Promise<DigitalReceiptActionResult> {
  noStore();
  try {
    const { mode, threat } = await resolveThreatForReceiptForActiveTenant(threatId);
    const tail = await loadAuditTailForDigitalReceipt(mode, threat.id);
    const scalars = toReceiptThreatScalars(threat);
    const { receipt } = buildDigitalReceiptDocument({
      plane: mode === "sim" ? "shadow" : "production",
      goldenSource: mode === "prod",
      threat: { ...scalars, receiptHash: null },
      auditTail: tail,
    });
    return {
      success: true,
      plane: mode === "sim" ? "shadow" : "production",
      goldenSource: mode === "prod",
      receiptJson: JSON.stringify(receipt, null, 2),
      rowReceiptHash: threat.receiptHash,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

const ELEVATION_TARGETS = new Set(["CONFIDENTIAL", "SECRET", "TOP_SECRET"]);

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export type SubmitClearanceElevationResult =
  | { ok: true; requestId: string }
  | { ok: false; error: string };

/** Creates a pending simulated clearance elevation (PERSEC / Ironlock pipeline). */
export async function submitClearanceElevationRequest(payload: {
  targetClearance: string;
  justification: string;
  riskEventId?: string;
}): Promise<SubmitClearanceElevationResult> {
  noStore();
  const justification = payload.justification.trim();
  if (!justification) {
    return { ok: false, error: "Justification is required." };
  }
  const normalized = normalizeClearanceLevel(payload.targetClearance);
  if (!ELEVATION_TARGETS.has(normalized)) {
    return { ok: false, error: "Target clearance must be CONFIDENTIAL, SECRET, or TOP_SECRET." };
  }

  const sessionUser = await getSupabaseSessionUser();
  const userId =
    typeof sessionUser?.id === "string" && sessionUser.id.trim().length > 0
      ? sessionUser.id.trim()
      : "shadow-operator";

  const rid = payload.riskEventId?.trim();
  const created = await prisma.clearanceRequest.create({
    data: {
      userId,
      riskEventId: rid && rid.length > 0 ? rid : null,
      targetClearance: normalized,
      status: "PENDING",
      justification,
    },
    select: { id: true },
  });

  return { ok: true, requestId: created.id };
}

export type ProcessClearanceRequestResult =
  | { ok: true; approved: true; targetClearance: string; userId: string }
  | { ok: true; approved: false }
  | { ok: false; error: string };

/**
 * Ironlock simulation: fixed delay, ~90% approval; updates request row, resilience intel + clearance cookie on approve.
 */
export async function processClearanceRequest(requestId: string): Promise<ProcessClearanceRequestResult> {
  noStore();
  const id = requestId.trim();
  if (!id) return { ok: false, error: "Missing request id." };

  const row = await prisma.clearanceRequest.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      userId: true,
      targetClearance: true,
      riskEventId: true,
    },
  });
  if (!row) return { ok: false, error: "Request not found." };
  if (row.status !== "PENDING") {
    return { ok: false, error: "Request is no longer pending." };
  }

  await sleep(5000);

  const approved = Math.random() < 0.9;
  const streamTie = row.riskEventId?.trim() || row.id;

  if (!approved) {
    await prisma.clearanceRequest.update({
      where: { id: row.id },
      data: { status: "DENIED" },
      select: { id: true },
    });
    await recordResilienceIntelStreamLine(
      `🤖 [IRONLOCK] | Clearance elevation denied for User [${row.userId}] after identity verification check.`,
      streamTie,
    );
    return { ok: true, approved: false };
  }

  await prisma.clearanceRequest.update({
    where: { id: row.id },
    data: { status: "APPROVED" },
    select: { id: true },
  });

  const level = normalizeClearanceLevel(row.targetClearance);
  await recordResilienceIntelStreamLine(
    `🤖 [IRONLOCK] | Clearance for User [${row.userId}] elevated to [${level}] after identity verification.`,
    streamTie,
  );

  const cookieStore = await cookies();
  cookieStore.set(USER_CLEARANCE_COOKIE_NAME, level, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    httpOnly: false,
  });

  revalidatePath("/evidence");

  return { ok: true, approved: true, targetClearance: level, userId: row.userId };
}
