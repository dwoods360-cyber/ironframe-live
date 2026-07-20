/** Shared labels for the HITL approvals desk — one queue, three draft kinds. */

export type ApprovalDraftKind = "SUPPORT" | "SALES" | "CUSTOMER_SUCCESS";

export type ApprovalKindFilter = ApprovalDraftKind | "ALL";

export const APPROVAL_DRAFT_KINDS: readonly ApprovalDraftKind[] = [
  "SALES",
  "SUPPORT",
  "CUSTOMER_SUCCESS",
] as const;

export const APPROVAL_KIND_META: Record<
  ApprovalDraftKind,
  {
    shortLabel: string;
    title: string;
    hue: "amber" | "emerald" | "violet";
    /** Who queued this draft. */
    source: string;
    /** What DISPATCH does. */
    dispatchMeans: string;
    tabLabel: string;
  }
> = {
  SALES: {
    shortLabel: "SALES",
    title: "Sales outreach",
    hue: "amber",
    source: "SalesTeam → prospect-pool CRM",
    dispatchMeans: "Sends the edited email or SMS to the prospect (HITL only).",
    tabLabel: "Sales",
  },
  SUPPORT: {
    shortLabel: "SUPPORT",
    title: "Support reply",
    hue: "emerald",
    source: "IronSupportTeam / support intake",
    dispatchMeans: "Sends the edited reply to the tenant operator who asked for help.",
    tabLabel: "Support",
  },
  CUSTOMER_SUCCESS: {
    shortLabel: "CS",
    title: "Customer success advisory",
    hue: "violet",
    source: "IronSuccessTeam (CLOSED_WON / ACTIVE advisories)",
    dispatchMeans: "Sends the edited advisory to the partner success contact.",
    tabLabel: "Customer success",
  },
};

export function parseApprovalKindFilter(raw: string | null | undefined): ApprovalKindFilter {
  const value = (raw ?? "").trim().toUpperCase();
  if (value === "SALES" || value === "SUPPORT" || value === "CUSTOMER_SUCCESS") {
    return value;
  }
  if (value === "CS") return "CUSTOMER_SUCCESS";
  return "ALL";
}

export function approvalsHref(kind: ApprovalKindFilter = "ALL"): string {
  if (kind === "ALL") return "/dashboard/admin/approvals";
  return `/dashboard/admin/approvals?kind=${kind}`;
}

export function draftKindCardClass(kind: ApprovalDraftKind, selected: boolean): string {
  const base = selected
    ? {
        SALES: "border-amber-500 bg-amber-950/30 shadow-md shadow-amber-950/30",
        SUPPORT: "border-emerald-500 bg-emerald-950/30 shadow-md shadow-emerald-950/30",
        CUSTOMER_SUCCESS: "border-violet-500 bg-violet-950/30 shadow-md shadow-violet-950/30",
      }
    : {
        SALES: "border-amber-900/50 bg-amber-950/15 hover:border-amber-700/60",
        SUPPORT: "border-emerald-900/50 bg-emerald-950/15 hover:border-emerald-700/60",
        CUSTOMER_SUCCESS: "border-violet-900/50 bg-violet-950/15 hover:border-violet-700/60",
      };
  return base[kind];
}

export function draftKindBadgeClass(kind: ApprovalDraftKind): string {
  switch (kind) {
    case "SALES":
      return "border-amber-700/50 bg-amber-950/60 text-amber-300";
    case "SUPPORT":
      return "border-emerald-700/50 bg-emerald-950/60 text-emerald-300";
    case "CUSTOMER_SUCCESS":
      return "border-violet-700/50 bg-violet-950/60 text-violet-300";
  }
}

export function draftKindBannerClass(kind: ApprovalDraftKind): string {
  switch (kind) {
    case "SALES":
      return "border-amber-800/50 bg-amber-950/40 text-amber-100";
    case "SUPPORT":
      return "border-emerald-800/50 bg-emerald-950/40 text-emerald-100";
    case "CUSTOMER_SUCCESS":
      return "border-violet-800/50 bg-violet-950/40 text-violet-100";
  }
}
