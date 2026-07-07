import "server-only";

import {
  DISPATCHED_DRAFT_TAG,
  parsePendingDraftSummary,
} from "@/app/lib/server/approvalQueueCore";
import {
  FORBIDDEN_TENANT_SUPPORT_FETCH_PREFIXES,
  TENANT_SUPPORT_API_PREFIXES,
  isForbiddenTenantSupportFetchPath,
} from "@/app/lib/support/supportApiBoundary";
import type { SupportPortalTicket } from "@/app/lib/server/supportPortalCore";
import type { SupportTicketStatus } from "@/app/types/tenantSupportPortal";
import type { TenantSafeSupportTicket } from "@/app/types/tenantSupportPortal";

export { FORBIDDEN_TENANT_SUPPORT_FETCH_PREFIXES, TENANT_SUPPORT_API_PREFIXES };
export { isForbiddenTenantSupportFetchPath };

export type { TenantSafeSupportTicket } from "@/app/types/tenantSupportPortal";

function extractDispatchedResolutionText(summary: string): string | null {
  if (!summary.includes(DISPATCHED_DRAFT_TAG)) return null;
  const authorized = summary.match(
    /--- Authorized Text Dispatched ---\s*([\s\S]*?)\s*--- Trace Matrix ---/,
  )?.[1];
  if (authorized?.trim()) return authorized.trim();
  return parsePendingDraftSummary(summary).proposedReply?.trim() || null;
}

/** Strip worker draft internals and CRM summary blobs from tenant-visible ticket payloads. */
export function toTenantSafeSupportTicket(ticket: SupportPortalTicket): TenantSafeSupportTicket {
  const { summaryExcerpt: _summaryExcerpt, proposedReply: _proposedReply, ...rest } = ticket;

  let resolutionText: string | null = null;
  if (ticket.status === "DISPATCHED") {
    resolutionText =
      extractDispatchedResolutionText(ticket.summaryExcerpt) ?? ticket.proposedReply?.trim() ?? null;
  }

  return {
    ...rest,
    resolutionText,
  };
}

export function assertTenantSupportTicketStatus(
  status: string | undefined,
): SupportTicketStatus | "ALL" | undefined {
  const normalized = status?.trim().toUpperCase();
  if (!normalized || normalized === "ALL") return "ALL";
  const allowed: SupportTicketStatus[] = [
    "OPEN",
    "IN_PROGRESS",
    "AWAITING_APPROVAL",
    "DISPATCHED",
    "PURGED",
  ];
  return allowed.includes(normalized as SupportTicketStatus)
    ? (normalized as SupportTicketStatus)
    : undefined;
}
