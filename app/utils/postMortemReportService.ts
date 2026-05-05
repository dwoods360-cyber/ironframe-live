import prisma from "@/lib/prisma";
import { loadIncidentReportPayload } from "@/app/utils/incidentReportData";
import { appendLessonsLearnedReasoningAndStrategicBlock } from "@/app/utils/lessonsLearnedGate";
import { buildPostMortemPdfBytes } from "@/app/utils/generateIncidentReport";
import { generateDueDiligenceReport } from "@/app/utils/generateDueDiligenceReport";
import { persistPostMortemReportPdf } from "@/app/utils/postMortemReportStorage";

/**
 * Gate 7 finality: lessons-learned ReasoningLog rows, post-mortem PDF (NIST-oriented), persist, attach path.
 */
export async function generateAndAttachPostMortemReport(
  threatId: string,
  reportType: "STANDARD" | "DUE_DILIGENCE_NEGATIVE" = "STANDARD",
): Promise<void> {
  const sim = await prisma.riskEvent.findFirst({
    where: { id: threatId },
    select: { id: true, tenantCompanyId: true },
  });
  if (!sim?.tenantCompanyId) return;

  const company = await prisma.company.findFirst({
    where: { id: sim.tenantCompanyId },
    select: { tenantId: true },
  });
  const tenantUuid = company?.tenantId?.trim();
  if (!tenantUuid) return;

  const strategicRecommendations = await appendLessonsLearnedReasoningAndStrategicBlock(threatId);
  const payload = await loadIncidentReportPayload(threatId);
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

  await prisma.riskEvent.update({
    where: { id: threatId },
    data: { postMortemReportPath: storedPath },
  });
}
