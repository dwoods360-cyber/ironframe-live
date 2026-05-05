"use server";

import { ThreatState } from "@prisma/client";
import { logThreatActivity } from "@/app/actions/auditActions";
import { getCompanyIdForActiveTenant } from "@/app/lib/grc/clearanceThreatResolve";
import prisma from "@/lib/prisma";
import { loadIncidentReportPayload } from "@/app/utils/incidentReportData";
import { mergeIngestionDetailsPatchJson } from "@/app/utils/ingestionDetailsMerge";
import { revalidatePath } from "next/cache";
import { contributeAnonymizedLessonsAction } from "@/app/actions/exportActions";

export async function getIncidentReportPreviewAction(threatId: string): Promise<
  | {
      ok: true;
      caseId: string;
      title: string;
      reasoningCount: number;
      auditCount: number;
      forensicDriftMs: number | null;
    }
  | { ok: false; error: string }
> {
  const tid = threatId?.trim();
  if (!tid) return { ok: false, error: "Missing case id." };
  const companyId = await getCompanyIdForActiveTenant();
  if (companyId == null) return { ok: false, error: "No tenant context." };
  const row = await prisma.riskEvent.findFirst({
    where: { id: tid, tenantCompanyId: companyId },
    select: { postMortemReportPath: true },
  });
  if (!row?.postMortemReportPath) return { ok: false, error: "Report not available for this case." };
  const payload = await loadIncidentReportPayload(tid);
  if (!payload) return { ok: false, error: "Case not found." };
  return {
    ok: true,
    caseId: tid,
    title: payload.threat.title,
    reasoningCount: payload.reasoningLogs.length,
    auditCount: payload.auditLogs.length,
    forensicDriftMs: payload.forensicDriftMsAtDrillStart,
  };
}

/**
 * Ironscribe audit when PO acknowledges digital signature and downloads the PDF.
 */
export async function logPostMortemReportDownloadAction(
  threatId: string,
  signatureAcknowledged: boolean,
  contributeCommunity = false,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!signatureAcknowledged) {
    return { ok: false, error: "Digital signature acknowledgment is required." };
  }
  const tid = threatId?.trim();
  if (!tid) return { ok: false, error: "Missing case id." };
  const companyId = await getCompanyIdForActiveTenant();
  if (companyId == null) return { ok: false, error: "No tenant context." };
  const row = await prisma.riskEvent.findFirst({
    where: { id: tid, tenantCompanyId: companyId },
    select: { postMortemReportPath: true, ingestionDetails: true },
  });
  if (!row?.postMortemReportPath) return { ok: false, error: "Report not available." };

  await logThreatActivity(null, "REPORT_FINALIZED", `🤖 [REPORT_FINALIZED] | Post-mortem generated for Case ID ${tid}. Awaiting authority signature.`, {
    operatorId: "Ironscribe",
    simThreatId: tid,
  });

  const signedAt = new Date().toISOString();
  const mergedIngestion = mergeIngestionDetailsPatchJson(row.ingestionDetails ?? null, {
    productOwnerDigitalSignatureAtUtc: signedAt,
    productOwnerSignerLabel: "Dereck",
    grcForensicPostMortemSigned: true,
  });

  await prisma.riskEvent.update({
    where: { id: tid, tenantCompanyId: companyId },
    data: {
      status: ThreatState.CLOSED_ARCHIVED,
      ingestionDetails: mergedIngestion,
    },
  });

  if (contributeCommunity) {
    const contribute = await contributeAnonymizedLessonsAction(tid);
    if (!contribute.ok) {
      return { ok: false, error: contribute.error };
    }
    await logThreatActivity(
      null,
      "COMMUNITY_LESSONS_CONTRIBUTED",
      `🤖 [IRONETHIC_EXPORT] | Anonymized lessons contributed to community intelligence. Ref ${contribute.communityInsightId}.`,
      {
        operatorId: "Ironethic",
        simThreatId: tid,
      },
    );
  }

  revalidatePath("/");
  revalidatePath("/integrity");

  return { ok: true };
}
