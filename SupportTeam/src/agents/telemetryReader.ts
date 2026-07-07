import type { SupportContextSnapshot } from '../lib/contextSnapshotClient.js';
import type { SupportTicketWire } from '../lib/ticketsPollClient.js';
import {
  resolveSupportPlayIds,
  SUPPORT_KNOWLEDGE_CORPUS,
  urgencyToSeverityTier,
} from '../knowledge/supportCorpus.js';

export type EnrichedSupportTicket = SupportTicketWire & {
  severityTier: ReturnType<typeof urgencyToSeverityTier>;
  corpusPlayIds: string[];
  contextSnapshot: SupportContextSnapshot | null;
};

export function enrichTicketWithContext(
  ticket: SupportTicketWire,
  snapshot: SupportContextSnapshot | null,
): EnrichedSupportTicket {
  const corpusPlayIds = resolveSupportPlayIds({
    urgency: ticket.urgency,
    objective: ticket.objective,
    userNotes: ticket.userNotes,
    frameworkContext: ticket.frameworkContext,
  });

  return {
    ...ticket,
    severityTier: urgencyToSeverityTier(ticket.urgency),
    corpusPlayIds,
    contextSnapshot: snapshot,
  };
}

export function formatCorpusSteps(playIds: string[]): string {
  const lines: string[] = [];
  for (const id of playIds) {
    const play = SUPPORT_KNOWLEDGE_CORPUS[id];
    if (!play) continue;
    lines.push(`• ${play.title}`);
    for (const step of play.resolutionSteps) {
      lines.push(`  - ${step}`);
    }
  }
  return lines.join('\n');
}
