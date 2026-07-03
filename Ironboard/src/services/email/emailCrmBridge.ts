import type { NormalizedEmailMessage } from '../../types/email.js';
import { runCustomerServiceAgent } from '../../agents/customerService/index.js';
import { logInteraction } from '../crm/crmService.js';
import { getPrisma } from '../prisma.js';
import { parseEmailAddress } from './emailParser.js';

const MAX_BODY_LENGTH = 4000;

/**
 * Mirror inbound email into IronBoard CRM activity feed.
 * Multi-tenant collision: suppress auto-log when the same address spans tenants.
 */
export async function bridgeEmailToCrmPipeline(message: NormalizedEmailMessage): Promise<void> {
  const cleanFromAddress = parseEmailAddress(message.from);

  const matchingContacts = await getPrisma().ironboardCrmContact.findMany({
    where: { email: cleanFromAddress },
  });

  if (matchingContacts.length === 0) {
    console.warn(
      `[Ingress Suppressed] Inbound message from ${cleanFromAddress} matched no workspace entities.`,
    );
    return;
  }

  if (matchingContacts.length > 1) {
    console.error(
      `[Multi-Tenant Collision] Address ${cleanFromAddress} spans multiple tenants. Auto-logging skipped.`,
    );
    return;
  }

  const targetContact = matchingContacts[0];

  const truncatedBody =
    message.textBody.length > MAX_BODY_LENGTH
      ? `${message.textBody.substring(0, MAX_BODY_LENGTH)}\n... [TRUNCATED]`
      : message.textBody;

  const consolidatedSummary = [
    `[INBOUND EMAIL] ${message.subject}`,
    '--- Body ---',
    truncatedBody,
    '--- Meta ---',
    `ID: ${message.emailId} | MSG_ID: ${message.messageId}`,
  ].join('\n');

  await logInteraction(targetContact.tenantId, {
    contactId: targetContact.id,
    channel: 'EMAIL',
    summary: consolidatedSummary,
    occurredAt: message.timestamp.toISOString(),
  });

  console.log(
    `[Email CRM] Inbound activity mirrored for contact [${targetContact.id}] tenant [${targetContact.tenantId}]`,
  );

  runCustomerServiceAgent(targetContact.tenantId, targetContact.id, message).catch(agentErr =>
    console.error('[Email CRM] Customer Service agent pipeline failed:', agentErr),
  );
}
