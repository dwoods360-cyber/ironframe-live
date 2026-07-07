import { composeSupportReplyDraft, type SupportReplyDraft } from './replyDraftsman.js';
import type { EnrichedSupportTicket } from './telemetryReader.js';

export function gateSupportReplyDraft(ticket: EnrichedSupportTicket): SupportReplyDraft {
  const draft = composeSupportReplyDraft(ticket);
  if (draft.body.trim().length < 40) {
    throw new Error('SUPPORT_DRAFT_TOO_SHORT');
  }
  return draft;
}
