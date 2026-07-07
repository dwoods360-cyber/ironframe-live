import { gateSupportReplyDraft } from '../agents/approvalGatekeeper.js';
import { enrichTicketWithContext } from '../agents/telemetryReader.js';
import { fetchSupportContextSnapshot } from '../lib/contextSnapshotClient.js';
import { getSupportTeamPrisma } from '../lib/prisma.js';
import { submitSupportReplyDraft } from '../lib/replyIngressClient.js';
import { pollSupportTicketsQueue } from '../lib/ticketsPollClient.js';
import { getIngressConfig } from '../loadSupportTeamEnv.js';
import type { SupportTeamGraphState } from './state.js';

type NodeState = Partial<SupportTeamGraphState>;

function logStep(message: string): { pipelineLog: string[] } {
  return { pipelineLog: [message] };
}

export async function pollTicketsNode(state: NodeState): Promise<Partial<SupportTeamGraphState>> {
  const poll = await pollSupportTicketsQueue(50);
  if (!poll.ok) {
    return {
      tickets: [],
      newTicketIds: [],
      error: poll.message,
      ...logStep(`[poll] failed: ${poll.message}`),
    };
  }

  const prisma = getSupportTeamPrisma();
  const processed = await prisma.processedTicket.findMany({
    where: { ironframeInteractionId: { in: poll.tickets.map((t) => t.interactionId) } },
    select: { ironframeInteractionId: true },
  });
  const processedSet = new Set(processed.map((row) => row.ironframeInteractionId));
  const newTicketIds = poll.tickets
    .filter((t) => !processedSet.has(t.interactionId))
    .map((t) => t.interactionId);

  return {
    tickets: poll.tickets,
    newTicketIds,
    error: null,
    ...logStep(`[poll] saw ${poll.tickets.length} tickets; ${newTicketIds.length} new`),
  };
}

export async function enrichContextNode(state: NodeState): Promise<Partial<SupportTeamGraphState>> {
  if (state.error) return {};

  const { targetTenantSlug } = getIngressConfig();
  const snapshotResult = await fetchSupportContextSnapshot(targetTenantSlug);
  const snapshot = snapshotResult.ok ? snapshotResult.snapshot : null;

  const newSet = new Set(state.newTicketIds ?? []);
  const targets = (state.tickets ?? []).filter((t) => newSet.has(t.interactionId));
  const enriched = targets.map((ticket) => enrichTicketWithContext(ticket, snapshot));

  return {
    snapshots: { [targetTenantSlug]: snapshot },
    enriched,
    ...logStep(`[telemetryReader] enriched ${enriched.length} tickets`),
  };
}

export async function queueReplyNode(state: NodeState): Promise<Partial<SupportTeamGraphState>> {
  if (state.error) return {};

  const { targetTenantSlug } = getIngressConfig();
  const prisma = getSupportTeamPrisma();
  const drafts: NonNullable<SupportTeamGraphState['drafts']> = [];

  for (const ticket of state.enriched ?? []) {
    try {
      const draft = gateSupportReplyDraft(ticket);
      const result = await submitSupportReplyDraft({
        tenantSlug: targetTenantSlug,
        intakeInteractionId: draft.intakeInteractionId,
        contactId: draft.contactId,
        subject: draft.subject,
        body: draft.body,
        severityTier: draft.severityTier,
        corpusPlayIds: draft.corpusPlayIds,
      });

      if (!result.ok) {
        drafts.push({ ...draft, shipped: false, error: result.message });
        await prisma.processedTicket.create({
          data: {
            ironframeInteractionId: ticket.interactionId,
            tenantId: ticket.tenantId,
            contactId: ticket.contactId,
            severityTier: draft.severityTier,
            status: 'FAILED',
            errorMessage: result.message,
          },
        });
        continue;
      }

      drafts.push({ ...draft, shipped: true, interactionId: result.interactionId });
      await prisma.processedTicket.create({
        data: {
          ironframeInteractionId: ticket.interactionId,
          tenantId: ticket.tenantId,
          contactId: ticket.contactId,
          severityTier: draft.severityTier,
          status: 'REPLY_QUEUED',
          replyInteractionId: result.interactionId,
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'reply queue failed';
      drafts.push({
        intakeInteractionId: ticket.interactionId,
        contactId: ticket.contactId,
        subject: 'Support reply',
        body: '',
        severityTier: ticket.severityTier as 'T1_CRITICAL' | 'T2_ELEVATED' | 'T3_ROUTINE',
        corpusPlayIds: ticket.corpusPlayIds,
        narrativeEnhanced: false,
        shipped: false,
        error: message,
      });
    }
  }

  const shipped = drafts.filter((d) => d.shipped).length;
  return {
    drafts,
    ...logStep(`[approvalGatekeeper] ${shipped}/${drafts.length} replies queued for human review`),
  };
}
