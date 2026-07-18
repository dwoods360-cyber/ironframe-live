import type { GfPublicationDeskAgentId } from "./agents";

export type DeskReviewStatus = "pass" | "fail" | "warn" | "skipped" | "advisory";

export type DeskAgentFinding = {
  agentId: GfPublicationDeskAgentId;
  status: DeskReviewStatus;
  summary: string;
  notes: string[];
};

export type DeskReviewChecklist = {
  schemaVersion: 1;
  filename: string;
  updatedAt: string;
  /** Soft UX signal — hard gate remains promoteBriefingDraftCore. */
  readyForHumanOperator: boolean;
  findings: DeskAgentFinding[];
  productBoundaryIssues: string[];
  regulatoryFlags: string[];
  verificationNotes: string[];
  editorNotes: string[];
  pipelineLog: string[];
};

export function emptyDeskReview(filename: string): DeskReviewChecklist {
  return {
    schemaVersion: 1,
    filename,
    updatedAt: new Date().toISOString(),
    readyForHumanOperator: false,
    findings: [],
    productBoundaryIssues: [],
    regulatoryFlags: [],
    verificationNotes: [],
    editorNotes: [],
    pipelineLog: [],
  };
}

export function computeReadyForHumanOperator(review: DeskReviewChecklist): boolean {
  const byId = new Map(review.findings.map((f) => [f.agentId, f]));
  const required: GfPublicationDeskAgentId[] = [
    "gf-verifier",
    "gf-editor",
    "gf-regulatory-reviewer",
    "gf-product-boundary",
  ];
  return required.every((id) => {
    const finding = byId.get(id);
    return finding?.status === "pass" || finding?.status === "advisory";
  });
}
