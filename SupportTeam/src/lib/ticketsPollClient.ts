import { loadSupportTeamEnv, getIngressConfig } from '../loadSupportTeamEnv.js';

loadSupportTeamEnv();

export type SupportTicketWire = {
  interactionId: string;
  tenantId: string;
  contactId: string;
  company: string;
  fullName: string;
  email: string;
  urgency: string;
  objective: string;
  userNotes: string;
  frameworkContext: string | null;
  path: string | null;
  surface: string | null;
  incomingQuery: string;
  telemetryExcerpt: string | null;
  occurredAt: string;
};

export type TicketsPollResult =
  | { ok: true; tenantId: string; tickets: SupportTicketWire[]; polledAt: string }
  | { ok: false; message: string };

export async function pollSupportTicketsQueue(limit = 50): Promise<TicketsPollResult> {
  const { baseUrl, secret, targetTenantSlug } = getIngressConfig();
  if (!secret) {
    return { ok: false, message: 'SUPPORT_TEAM_INGRESS_SECRET not configured' };
  }

  const url = new URL(`${baseUrl.replace(/\/$/, '')}/api/v1/ingress/support-team/tickets`);
  url.searchParams.set('tenantSlug', targetTenantSlug);
  url.searchParams.set('limit', String(limit));

  const response = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${secret}` },
    cache: 'no-store',
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    return { ok: false, message: `tickets ingress ${response.status}: ${text.slice(0, 200)}` };
  }

  const data = (await response.json()) as {
    tenantId: string;
    tickets: SupportTicketWire[];
    polledAt: string;
  };
  return { ok: true, tenantId: data.tenantId, tickets: data.tickets, polledAt: data.polledAt };
}
