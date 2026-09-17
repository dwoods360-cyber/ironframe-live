import { withIronguardTenant } from "@/app/lib/server/ironguardSessionTenant";
import { loadIncidentReportPayload } from "@/app/utils/incidentReportData";
import { appendLessonsLearnedReasoningAndStrategicBlock } from "@/app/utils/lessonsLearnedGate";
import { buildPostMortemPdfBytes } from "@/app/utils/generateIncidentReport";
import { generateDueDiligenceReport } from "@/app/utils/generateDueDiligenceReport";
import { persistPostMortemReportPdf } from "@/app/utils/postMortemReportStorage";
import { getScopedTenantUuidFromCookies } from "@/app/utils/serverTenantContext";

/**
 * Gate 7 finality: lessons-learned ReasoningLog rows, post-mortem PDF (NIST-oriented), persist, attach path.
 */
export async function generateAndAttachPostMortemReport(
  threatId: string,
  reportType: "STANDARD" | "DUE_DILIGENCE_NEGATIVE" = "STANDARD",
  tenantId?: string,
): Promise<void> {
  const tenantUuid = tenantId?.trim() || (await getScopedTenantUuidFromCookies())?.trim();
  if (!tenantUuid) return;

  const sim = await withIronguardTenant(tenantUuid, (tx) =>
    tx.riskEvent.findFirst({
      where: { id: threatId, tenantId: tenantUuid },
      select: { id: true, tenantCompanyId: true },
    }),
  );
  if (!sim?.tenantCompanyId) return;

  const strategicRecommendations = await appendLessonsLearnedReasoningAndStrategicBlock(
    threatId,
    tenantUuid,
  );
  const payload = await loadIncidentReportPayload(threatId, tenantUuid);
  if (!payload) return;

  const bytes =
    reportType === "DUE_DILIGENCE_NEGATIVE"
      ? generateDueDiligenceReport({
          ...payload,
          strategicRecommendations,
        })
      : buildPostMortemPdfBytes({
          ...payload,
          strategicRecommendations,
        });
  const storedPath = await persistPostMortemReportPdf({
    tenantUuid,
    threatId,
    bytes,
  });

  await withIronguardTenant(tenantUuid, (tx) =>
    tx.riskEvent.updateMany({
      where: { id: threatId, tenantId: tenantUuid },
      data: { postMortemReportPath: storedPath },
    }),
  );
}
