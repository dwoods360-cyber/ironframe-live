/**
 * Browser bridge: LIVE desk persists last call recap so the order form can suggest (not bind).
 */

import type { WorkflowReviewCallRecap } from "@/app/lib/server/workflowReviewCallAssistCore";

export const WORKFLOW_REVIEW_RECAP_STORAGE_KEY =
  "ironframe.workflowReview.lastRecap.v1" as const;

export type WorkflowReviewRecapBridgePayload = Pick<
  WorkflowReviewCallRecap,
  | "generatedAt"
  | "company"
  | "contactName"
  | "summary"
  | "actionItems"
  | "openQuestions"
  | "pathBAsk"
  | "closeReadiness"
>;

export function persistWorkflowReviewRecap(
  recap: WorkflowReviewCallRecap,
  storage: Pick<Storage, "setItem"> = globalThis.sessionStorage,
): void {
  try {
    const payload: WorkflowReviewRecapBridgePayload = {
      generatedAt: recap.generatedAt,
      company: recap.company,
      contactName: recap.contactName,
      summary: recap.summary,
      actionItems: recap.actionItems,
      openQuestions: recap.openQuestions,
      pathBAsk: recap.pathBAsk,
      closeReadiness: recap.closeReadiness,
    };
    storage.setItem(WORKFLOW_REVIEW_RECAP_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Private mode / quota — suggest-from-call simply unavailable.
  }
}

export function loadWorkflowReviewRecap(
  storage: Pick<Storage, "getItem"> = globalThis.sessionStorage,
): WorkflowReviewRecapBridgePayload | null {
  try {
    const raw = storage.getItem(WORKFLOW_REVIEW_RECAP_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as WorkflowReviewRecapBridgePayload;
    if (!parsed || typeof parsed.company !== "string") return null;
    return parsed;
  } catch {
    return null;
  }
}
