import { z } from 'zod';

import type { SupportReplyDraft } from '../agents/replyDraftsman.js';
import type { SupportTicketWire } from '../lib/ticketsPollClient.js';
import type { SupportContextSnapshot } from '../lib/contextSnapshotClient.js';

export const SupportTeamStateSchema = z.object({
  runId: z.string(),
  tickets: z.array(z.custom<SupportTicketWire>()),
  newTicketIds: z.array(z.string()),
  snapshots: z.record(z.custom<SupportContextSnapshot | null>()).optional(),
  enriched: z.array(z.custom<EnrichedTicket>()).optional(),
  drafts: z.array(z.custom<DraftRow>()).optional(),
  pipelineLog: z.array(z.string()),
  error: z.string().nullable(),
});

export type EnrichedTicket = SupportTicketWire & {
  severityTier: string;
  corpusPlayIds: string[];
  contextSnapshot: SupportContextSnapshot | null;
};

export type DraftRow = SupportReplyDraft & {
  shipped: boolean;
  interactionId?: string;
  error?: string;
};

export type SupportTeamGraphState = z.infer<typeof SupportTeamStateSchema>;

export type SupportTeamPipelineInput = {
  threadId?: string;
};
