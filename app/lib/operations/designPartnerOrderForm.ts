/**
 * Design-partner order form — suggest-from-recap + lock-word freeze.
 * Commercial locks never come from transcript. Criteria are suggestions only until partner lock.
 */

import {
  DESIGN_PARTNER_CONVERT_CREDIT_USD,
  DESIGN_PARTNER_DEFAULT_WINDOW_DAYS,
  DESIGN_PARTNER_MIN_WINDOW_DAYS,
  DESIGN_PARTNER_PATH_B_USD,
  PLANNED_GA_COMMAND_USD,
  formatPathBUsd,
  formatPlannedGaCommandUsd,
  formatUsdWhole,
} from "@/lib/ironframeProductKnowledge/commercial";

/** Canonical partner lock word (spoken or typed). Case-insensitive. */
export const DESIGN_PARTNER_ORDER_FORM_LOCK_WORD = "AGREED" as const;

export const DESIGN_PARTNER_ORDER_FORM_STORAGE_KEY =
  "ironframe.designPartnerOrderForm.v1" as const;

export type DesignPartnerOrderFormCommercialLocks = {
  product: string;
  feeUsd: number;
  feeLabel: string;
  convertCreditUsd: number;
  convertCreditLabel: string;
  plannedGaUsd: number;
  plannedGaLabel: string;
  refunds: string;
  payment: string;
};

export type DesignPartnerOrderFormDraft = {
  customerLegalName: string;
  billingContactName: string;
  billingEmail: string;
  operatorEmail: string;
  workspaceSlug: string;
  effectiveDate: string;
  pilotWindowDays: number;
  engSyncWeeks: string;
  successCriteria: [string, string, string];
  ironframeEntity: string;
  /** Source note when fields were suggested from LIVE recap (not a bind). */
  suggestedFromRecapAt: string | null;
  suggestedFromCompany: string | null;
};

export type DesignPartnerOrderFormLockState = {
  locked: boolean;
  lockedAt: string | null;
  lockedByNote: string | null;
  unlockAudit: Array<{ at: string; reason: string }>;
};

export type DesignPartnerOrderFormSuggestInput = {
  company?: string | null;
  contactName?: string | null;
  summary?: string[];
  actionItems?: Array<{ owner: string; text: string }>;
  openQuestions?: string[];
  generatedAt?: string | null;
};

export const ORDER_FORM_COMMERCIAL_LOCKS: DesignPartnerOrderFormCommercialLocks = {
  product: "Ironframe Command Tier — design-partner / Path B on-ramp",
  feeUsd: DESIGN_PARTNER_PATH_B_USD,
  feeLabel: `${formatPathBUsd()} USD one-time platform on-ramp (flat; no seat licenses)`,
  convertCreditUsd: DESIGN_PARTNER_CONVERT_CREDIT_USD,
  convertCreditLabel: `If Customer converts to Command within the Path B window, the Path B ${formatPathBUsd()} fee is credited to year-1 Command (fixed convert credit — not a negotiated %). Year-1 net ≈ list minus ${formatPathBUsd()}`,
  plannedGaUsd: PLANNED_GA_COMMAND_USD,
  plannedGaLabel: `Ironframe Command planned list ~${formatPlannedGaCommandUsd()}/yr (list price)`,
  refunds: `Path B ${formatPathBUsd()} is non-refundable on exit or mid-window termination — no refund, no % off Path B`,
  payment:
    "Stripe tenant-scoped Path B activation link (not generic public /pricing for existing PENDING workspaces)",
};

export function createEmptyOrderFormDraft(
  overrides?: Partial<DesignPartnerOrderFormDraft>,
): DesignPartnerOrderFormDraft {
  const today = new Date().toISOString().slice(0, 10);
  return {
    customerLegalName: "",
    billingContactName: "",
    billingEmail: "",
    operatorEmail: "",
    workspaceSlug: "",
    effectiveDate: today,
    pilotWindowDays: DESIGN_PARTNER_DEFAULT_WINDOW_DAYS,
    engSyncWeeks: "4–6",
    successCriteria: ["", "", ""],
    ironframeEntity: "Ironframe GRC",
    suggestedFromRecapAt: null,
    suggestedFromCompany: null,
    ...overrides,
  };
}

export function createEmptyOrderFormLockState(): DesignPartnerOrderFormLockState {
  return {
    locked: false,
    lockedAt: null,
    lockedByNote: null,
    unlockAudit: [],
  };
}

export function normalizeLockWord(input: string): string {
  return String(input ?? "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

export function matchesOrderFormLockWord(
  input: string,
  expected: string = DESIGN_PARTNER_ORDER_FORM_LOCK_WORD,
): boolean {
  return normalizeLockWord(input) === normalizeLockWord(expected);
}

/** Heuristic drafts only — never commercial locks. */
export function suggestOrderFormFromRecap(
  input: DesignPartnerOrderFormSuggestInput,
  base?: DesignPartnerOrderFormDraft,
): DesignPartnerOrderFormDraft {
  const draft = createEmptyOrderFormDraft(base);
  const company = String(input.company ?? "").trim();
  const contact = String(input.contactName ?? "").trim();

  if (company && company.toLowerCase() !== "prospect") {
    draft.customerLegalName = company;
    const slug = company
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40);
    if (slug && !draft.workspaceSlug) draft.workspaceSlug = slug;
  }
  if (contact) {
    draft.billingContactName = contact;
  }

  const criteria = extractSuggestedCriteria(input).slice(0, 3);
  draft.successCriteria = [
    criteria[0] ?? draft.successCriteria[0],
    criteria[1] ?? draft.successCriteria[1],
    criteria[2] ?? draft.successCriteria[2],
  ];

  draft.suggestedFromRecapAt = input.generatedAt ?? new Date().toISOString();
  draft.suggestedFromCompany = company || null;
  return draft;
}

function extractSuggestedCriteria(input: DesignPartnerOrderFormSuggestInput): string[] {
  const out: string[] = [];
  const push = (raw: string) => {
    const text = cleanCriteriaCandidate(raw);
    if (!text) return;
    const key = text.toLowerCase();
    if (out.some((c) => c.toLowerCase() === key)) return;
    out.push(text);
  };

  for (const item of input.actionItems ?? []) {
    if (item.owner === "prospect") {
      push(item.text.replace(/^Follow up on:\s*[“"]?/i, "").replace(/[”"]$/g, ""));
    }
    if (/success|criteria|metric|measure|outcome|board|evidence/i.test(item.text)) {
      const clipped = item.text.replace(/^Send Path B order form.*/i, "").trim();
      if (clipped && !/^Send Path B/i.test(item.text)) push(clipped);
    }
  }

  for (const q of input.openQuestions ?? []) {
    if (/success|criteria|metric|measure|board|evidence|isolation/i.test(q)) {
      push(q);
    }
  }

  for (const line of input.summary ?? []) {
    const m = line.match(/(?:criteria|metric|measure|success)[:\s—-]+(.{12,140})/i);
    if (m?.[1]) push(m[1]);
  }

  return out.slice(0, 3);
}

function cleanCriteriaCandidate(raw: string): string | null {
  let text = String(raw ?? "").replace(/\s+/g, " ").trim();
  if (text.length < 12) return null;
  // Never invent commercial terms into criteria.
  if (/\$4,?999|non-?refund|convert credit|% off|free (poc|pilot|trial)/i.test(text)) {
    return null;
  }
  if (/^Send Path B/i.test(text) || /^Frame Path B/i.test(text)) return null;
  text = text.replace(/^Follow up on:\s*/i, "").replace(/^["“]|["”]$/g, "");
  return text.slice(0, 200);
}

export function filledSuccessCriteriaCount(draft: DesignPartnerOrderFormDraft): number {
  return draft.successCriteria.filter((c) => c.trim().length >= 8).length;
}

export type OrderFormLockEligibility = {
  ok: boolean;
  reasons: string[];
};

export function evaluateOrderFormLockEligibility(
  draft: DesignPartnerOrderFormDraft,
): OrderFormLockEligibility {
  const reasons: string[] = [];
  if (!draft.customerLegalName.trim()) reasons.push("Customer legal name required");
  if (!draft.operatorEmail.trim()) reasons.push("Operator email required");
  if (/@ironframegrc\.com$/i.test(draft.operatorEmail.trim())) {
    reasons.push("Operator email must be client-owned (not @ironframegrc.com)");
  }
  if (!draft.workspaceSlug.trim()) reasons.push("Workspace slug required");
  const n = filledSuccessCriteriaCount(draft);
  if (n < 2) reasons.push("Exactly 2 or 3 success criteria required (need at least 2)");
  if (n > 3) reasons.push("At most 3 success criteria");
  if (
    draft.pilotWindowDays < DESIGN_PARTNER_MIN_WINDOW_DAYS ||
    draft.pilotWindowDays > DESIGN_PARTNER_DEFAULT_WINDOW_DAYS + 30
  ) {
    reasons.push(
      `Pilot window must be ≥ ${DESIGN_PARTNER_MIN_WINDOW_DAYS} days (default ${DESIGN_PARTNER_DEFAULT_WINDOW_DAYS})`,
    );
  }
  return { ok: reasons.length === 0, reasons };
}

export function lockOrderForm(
  state: DesignPartnerOrderFormLockState,
  opts: { note?: string; at?: string } = {},
): DesignPartnerOrderFormLockState {
  return {
    ...state,
    locked: true,
    lockedAt: opts.at ?? new Date().toISOString(),
    lockedByNote: opts.note?.trim() || "Partner confirmed with lock word",
  };
}

export function unlockOrderForm(
  state: DesignPartnerOrderFormLockState,
  reason: string,
  at?: string,
): DesignPartnerOrderFormLockState {
  const trimmed = String(reason ?? "").trim();
  if (trimmed.length < 4) {
    throw new Error("Unlock requires a short reason (audit).");
  }
  return {
    locked: false,
    lockedAt: null,
    lockedByNote: null,
    unlockAudit: [
      ...state.unlockAudit,
      { at: at ?? new Date().toISOString(), reason: trimmed.slice(0, 240) },
    ],
  };
}

export function renderOrderFormMarkdown(
  draft: DesignPartnerOrderFormDraft,
  locks: DesignPartnerOrderFormCommercialLocks = ORDER_FORM_COMMERCIAL_LOCKS,
  lockState?: DesignPartnerOrderFormLockState,
): string {
  const criteria = draft.successCriteria
    .map((c, i) => `${i + 1}. ${c.trim() || "________________________________________________________________"}`)
    .join("\n");
  const lockBanner = lockState?.locked
    ? `\n**LOCKED** at ${lockState.lockedAt ?? "—"} — ${lockState.lockedByNote ?? "partner confirmed"}\n`
    : "\n**Status:** Draft — not locked; not for signature until partner lock word.\n";

  return `# Design-partner Command Tier — order form
${lockBanner}
## Parties

| Field | Value |
|-------|--------|
| **Customer legal name** | ${draft.customerLegalName || ""} |
| **Billing contact name / email** | ${draft.billingContactName || ""} / ${draft.billingEmail || ""} |
| **Operator email (workspace invite)** | ${draft.operatorEmail || ""} |
| **Workspace slug (subdomain)** | \`${draft.workspaceSlug || "____________"}.ironframegrc.com\` |
| **Ironframe entity** | ${draft.ironframeEntity || "Ironframe GRC"} |
| **Effective date** | ${draft.effectiveDate || ""} |

## Commercial terms (locked — not from call transcript)

| Term | Value |
|------|--------|
| **Product** | ${locks.product} |
| **Fee** | **${formatUsdWhole(locks.feeUsd)} USD** one-time platform on-ramp (flat; no seat licenses) |
| **Payment** | ${locks.payment} |
| **Pilot window** | **${draft.pilotWindowDays} days** (default **${DESIGN_PARTNER_DEFAULT_WINDOW_DAYS}**, min **${DESIGN_PARTNER_MIN_WINDOW_DAYS}**) from payment → ACTIVE |
| **Engineering syncs** | Weekly for first **${draft.engSyncWeeks}** weeks, then async only unless amended in writing |
| **Planned GA reference** | ${locks.plannedGaLabel} |
| **Convert credit** | ${locks.convertCreditLabel} |
| **Refunds** | ${locks.refunds} |

## Success criteria (exactly 2 or 3)

${criteria}

**Exit:** If criteria are unmet at window end and Customer elects not to convert, workspace may be offboarded per Terms. Path B fee is not refunded and is not credited unless Customer converts within the window.

## Data & legal pointers

- Order incorporates then-current Terms and Privacy.
- Customer warrants operator email is controlled by Customer’s organization.
${
  draft.suggestedFromRecapAt
    ? `\n_Suggest-from-call used ${draft.suggestedFromRecapAt}${draft.suggestedFromCompany ? ` (${draft.suggestedFromCompany})` : ""} — partner-owned wording required before lock._\n`
    : ""
}
## Signatures

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Customer authorized signer | | | |
| Ironframe authorized signer | | | |
`;
}
