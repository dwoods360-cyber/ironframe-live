import type { Request } from "express";

import { corporateBoardGraph } from "../orchestrator.js";
import { FLAGSHIP_IRONFRAME_SAAS, INITIAL_PORTFOLIO } from "../seed.js";
import {
  buildDocumentationIngressFromRequest,
  fetchIronframeDocumentationBrief,
} from "./ingress/documentationIngress.js";
import type { IronframeDocumentationBrief } from "../types/ironframeDocumentationBrief.js";

export type DocumentationPipelineResult = {
  ok: boolean;
  brief: IronframeDocumentationBrief | null;
  documentationArtifacts: string[];
  executiveSummaryLog: string[];
  error?: string;
};

/**
 * Executes Trainer → Writer documentation authoring after one-way Ironframe brief ingress.
 * CEO/CFO/Compliance/Legal nodes still run to preserve constitutional clearance gates.
 */
export async function runDocumentationAuthoringPipeline(
  req: Pick<Request, "headers">,
  tenantId?: string,
): Promise<DocumentationPipelineResult> {
  const ingress = await fetchIronframeDocumentationBrief(
    buildDocumentationIngressFromRequest(req, tenantId),
  );

  if (!ingress.ok || !ingress.brief) {
    return {
      ok: false,
      brief: null,
      documentationArtifacts: [],
      executiveSummaryLog: [],
      error: ingress.error ?? "Documentation brief ingress failed",
    };
  }

  const finalGraphState = await corporateBoardGraph.invoke({
    products: INITIAL_PORTFOLIO,
    activeTargetProductId: FLAGSHIP_IRONFRAME_SAAS.id,
    businessObjective: `Documentation sync for ${ingress.brief.release} (${ingress.brief.posture}).`,
    financialProjectionsCents: ingress.brief.platformFacts.baselineTenantsCents.medshield,
    legalReviewCleared: false,
    departmentalApprovals: [],
    executiveSummaryLog: [
      `[Ingress] Ironframe documentation brief received (${ingress.brief.communicationDirection}).`,
    ],
    activeSpeaker: "CEO",
    documentationArtifacts: [],
    ironframeDocumentationBrief: JSON.stringify(ingress.brief),
  });

  return {
    ok: true,
    brief: ingress.brief,
    documentationArtifacts: finalGraphState.documentationArtifacts ?? [],
    executiveSummaryLog: finalGraphState.executiveSummaryLog ?? [],
  };
}
