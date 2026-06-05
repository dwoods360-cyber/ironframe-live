import { parseIngestionDetailsForMerge } from "@/app/utils/ingestionDetailsMerge";

/** Allowed `ingestionDetails.sourcePlane` values for Active Risks canvas rows. */
export const ACTIVE_CANVAS_SOURCE_PLANES = ["CHAOS", "MANUAL", "AGENT_DISCOVERY"] as const;

export type ActiveCanvasSourcePlane = (typeof ACTIVE_CANVAS_SOURCE_PLANES)[number];

export function parseActiveCanvasProvenance(
  ingestionDetails: string | null | undefined,
): { sourcePlane: ActiveCanvasSourcePlane | null; threadId: string | null } {
  try {
    const j = parseIngestionDetailsForMerge(ingestionDetails ?? null) as Record<string, unknown>;
    const planeRaw = typeof j.sourcePlane === "string" ? j.sourcePlane.trim().toUpperCase() : "";
    const sourcePlane = ACTIVE_CANVAS_SOURCE_PLANES.includes(planeRaw as ActiveCanvasSourcePlane)
      ? (planeRaw as ActiveCanvasSourcePlane)
      : null;
    const threadRaw =
      (typeof j.threadId === "string" ? j.threadId.trim() : "") ||
      (typeof j.orchestrationThreadId === "string" ? j.orchestrationThreadId.trim() : "");
    return { sourcePlane, threadId: threadRaw.length > 0 ? threadRaw : null };
  } catch {
    return { sourcePlane: null, threadId: null };
  }
}

/** Client-side defense-in-depth — mirrors server `*VerifiedIngestionProvenanceWhere`. */
export function hasVerifiedActiveCanvasProvenance(
  ingestionDetails: string | null | undefined,
): boolean {
  const { sourcePlane, threadId } = parseActiveCanvasProvenance(ingestionDetails);
  return sourcePlane != null && Boolean(threadId);
}
