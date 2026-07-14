const PENDING_SALES_DRAFT_TAG = "[PENDING SALES DRAFT APPROVAL]";
const PENDING_CS_ADVISORY_TAG = "[PENDING CS ADVISORY APPROVAL]";

export type DraftKind = "SUPPORT" | "SALES" | "CUSTOMER_SUCCESS";

export function inferDraftKindLight(summary: string): DraftKind {
  if (summary.includes(PENDING_CS_ADVISORY_TAG)) return "CUSTOMER_SUCCESS";
  return summary.includes(PENDING_SALES_DRAFT_TAG) ? "SALES" : "SUPPORT";
}

/** Sales SMS drafts are stored as CRM channel OTHER with Execution Source …SMS. */
export function isSalesSmsDraft(summary: string, crmChannel?: string | null): boolean {
  if (inferDraftKindLight(summary) !== "SALES") return false;
  if (/Execution Source:.*\bSMS\b/i.test(summary)) return true;
  return crmChannel === "OTHER" && /\bChannel:SMS\b/i.test(summary);
}
