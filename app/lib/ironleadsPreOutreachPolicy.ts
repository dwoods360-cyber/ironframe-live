/**
 * Pre-outreach automation gates — Research/enrich may fill the dossier and
 * queue a T1 Approvals draft. DISPATCH stays human.
 */

import { isSalesDispatchHoldCompany } from "@/app/lib/approvalDispatchValidation";
import { isPromoteReadyWorkEmail } from "@/app/lib/server/ironleadsAccountResearchBrief";

export function isHarvestPlaceholderEmail(email: string | null | undefined): boolean {
  const e = String(email || "").trim().toLowerCase();
  return !e || /@ironleads\.local$/i.test(e);
}

export function hasNamedBuyerName(name: string | null | undefined): boolean {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  return parts.length >= 2 && parts[0]!.length > 1 && parts[parts.length - 1]!.length > 1;
}

function holdBlocksAutomation(classification: string | null | undefined): boolean {
  const c = String(classification || "").trim().toLowerCase();
  return (
    c === "channel_competitor" ||
    c === "pending_batch" ||
    c === "hold" ||
    c === "other"
  );
}

function fitResult(fit: string | null | undefined): string {
  return String(fit || "").trim().toUpperCase();
}

/** Paid finders may run when a named buyer exists and the inbox is still a placeholder. */
export function shouldAutoEnrichPlaceholder(input: {
  email: string | null | undefined;
  namedBuyerName: string | null | undefined;
  fit: string | null | undefined;
  holdClassification: string | null | undefined;
  company: string | null | undefined;
}): boolean {
  if (isSalesDispatchHoldCompany(input.company)) return false;
  if (holdBlocksAutomation(input.holdClassification)) return false;
  if (fitResult(input.fit) === "FAIL") return false;
  if (!isHarvestPlaceholderEmail(input.email)) return false;
  return hasNamedBuyerName(input.namedBuyerName);
}

/** Queue a T1 EMAIL draft only when Fit PASS + named buyer + promote-ready work seat. */
export function shouldAutoQueueTouch1Draft(input: {
  email: string | null | undefined;
  namedBuyerName: string | null | undefined;
  fit: string | null | undefined;
  holdClassification: string | null | undefined;
  company: string | null | undefined;
}): boolean {
  if (isSalesDispatchHoldCompany(input.company)) return false;
  if (holdBlocksAutomation(input.holdClassification)) return false;
  if (fitResult(input.fit) !== "PASS") return false;
  if (!hasNamedBuyerName(input.namedBuyerName)) return false;
  return isPromoteReadyWorkEmail(input.email);
}
