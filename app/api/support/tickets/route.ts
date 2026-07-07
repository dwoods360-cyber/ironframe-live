import { NextRequest, NextResponse } from "next/server";

import {
  getSupportPortalTicket,
  listSupportPortalTickets,
  type SupportTicketStatus,
} from "@/app/lib/server/supportPortalCore";
import {
  assertTenantSupportTicketStatus,
  toTenantSafeSupportTicket,
} from "@/app/lib/server/supportTenantSurface";
import { assertAuthenticatedIronguardTenantOr403 } from "@/app/lib/security/tenantMembershipGuard";

export const dynamic = "force-dynamic";

/** GET /api/support/tickets — tenant support portal ticket ledger. */
export async function GET(req: NextRequest) {
  const guard = await assertAuthenticatedIronguardTenantOr403(req);
  if (!guard.ok) return guard.response;

  const tenantUuid = guard.tenantUuid;
  if (!tenantUuid) {
    return NextResponse.json({ error: "Tenant context unresolved." }, { status: 403 });
  }

  const statusParam = req.nextUrl.searchParams.get("status")?.trim();
  const status = assertTenantSupportTicketStatus(statusParam) ?? "ALL";

  const ticketId = req.nextUrl.searchParams.get("id")?.trim();
  if (ticketId) {
    const ticket = await getSupportPortalTicket(tenantUuid, ticketId);
    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found." }, { status: 404 });
    }
    return NextResponse.json({ ticket: toTenantSafeSupportTicket(ticket) });
  }

  const limitRaw = Number(req.nextUrl.searchParams.get("limit") ?? "100");
  const result = await listSupportPortalTickets(tenantUuid, {
    status: status === "ALL" ? undefined : status,
    limit: Number.isFinite(limitRaw) ? limitRaw : 100,
  });

  const counts = await listSupportPortalTickets(tenantUuid, { limit: 200 });
  const byStatus = counts.tickets.reduce(
    (acc, ticket) => {
      acc[ticket.status] = (acc[ticket.status] ?? 0) + 1;
      return acc;
    },
    {} as Record<SupportTicketStatus, number>,
  );

  return NextResponse.json({
    tickets: result.tickets.map(toTenantSafeSupportTicket),
    polledAt: result.polledAt,
    counts: byStatus,
    total: counts.tickets.length,
  });
}
