import "server-only";

/**
 * Operator HOLD archive — park SUSPECTs after HITL for later retrieval.
 * Stored on contact.metadata.operatorHold (deal stage stays SUSPECT).
 * Active Ironleads queue excludes archived rows; portal "HOLD archive" lists them.
 */

export type OperatorHoldRecord = {
  at: string;
  reason: string;
  source: "operator";
  classification: "hold" | "channel_competitor" | "enrich_later" | "other";
};

export const OPERATOR_HOLD_META_KEY = "operatorHold" as const;

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

export function resolveOperatorHold(metadata: unknown): OperatorHoldRecord | null {
  const meta = asRecord(metadata);
  const raw = asRecord(meta?.[OPERATOR_HOLD_META_KEY]);
  if (!raw) return null;
  const at = typeof raw.at === "string" && raw.at.trim() ? raw.at.trim() : null;
  if (!at) return null;
  const reason =
    typeof raw.reason === "string" && raw.reason.trim()
      ? raw.reason.trim().slice(0, 500)
      : "Operator HOLD archive";
  const classificationRaw =
    typeof raw.classification === "string" ? raw.classification.trim().toLowerCase() : "";
  const classification: OperatorHoldRecord["classification"] =
    classificationRaw === "channel_competitor" ||
    classificationRaw === "enrich_later" ||
    classificationRaw === "other" ||
    classificationRaw === "hold"
      ? classificationRaw
      : "hold";
  return {
    at,
    reason,
    source: "operator",
    classification,
  };
}

export function isOperatorHoldArchived(metadata: unknown): boolean {
  return resolveOperatorHold(metadata) != null;
}

export function buildOperatorHoldRecord(input: {
  reason?: string | null;
  classification?: OperatorHoldRecord["classification"] | null;
}): OperatorHoldRecord {
  const classification = input.classification ?? "hold";
  const reason =
    (input.reason ?? "").trim().slice(0, 500) ||
    (classification === "channel_competitor"
      ? "Channel / competitor — park for later re-qualify (not Path B cold)."
      : "Operator HOLD archive after HITL review.");
  return {
    at: new Date().toISOString(),
    reason,
    source: "operator",
    classification,
  };
}

export function applyOperatorHoldToMetadata(
  metadata: unknown,
  hold: OperatorHoldRecord,
): Record<string, unknown> {
  const prior = asRecord(metadata) ?? {};
  return {
    ...prior,
    [OPERATOR_HOLD_META_KEY]: hold,
  };
}

export function clearOperatorHoldFromMetadata(metadata: unknown): Record<string, unknown> {
  const prior = asRecord(metadata) ?? {};
  const next = { ...prior };
  delete next[OPERATOR_HOLD_META_KEY];
  return next;
}
