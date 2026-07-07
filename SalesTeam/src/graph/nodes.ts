import { draftOutboundMessage } from '../agents/outboundDraftsman.js';
import { planProspectCadence } from '../agents/cadencePlanner.js';
import { routeProspectChannel } from '../agents/channelCoordinator.js';
import { pollProspectQueue } from '../lib/crmPollClient.js';
import { submitOutreachDraft } from '../lib/outreachIngressClient.js';
import { getSalesTeamPrisma } from '../lib/prisma.js';
import { buildSmsBody } from '../tools/emailGateway.js';
import { getDefaultOutreachChannel, getIngressConfig } from '../loadSalesTeamEnv.js';
import type { BeachheadSector } from '../config/beachheadPrompts.js';
import type { SalesTeamGraphState } from './state.js';

type NodeState = Partial<SalesTeamGraphState>;

function logStep(message: string): { pipelineLog: string[] } {
  return { pipelineLog: [message] };
}

/** S-01 — poll Ironframe for PROSPECT-stage deals. */
export async function pollProspectsNode(state: NodeState): Promise<Partial<SalesTeamGraphState>> {
  const limit = 50;
  const poll = await pollProspectQueue(limit);
  if (!poll.ok) {
    return {
      prospects: [],
      newProspectIds: [],
      error: poll.message,
      ...logStep(`[poll] failed: ${poll.message}`),
    };
  }

  const prisma = getSalesTeamPrisma();
  const processed = await prisma.processedDeal.findMany({
    where: { ironframeDealId: { in: poll.prospects.map((p) => p.dealId) } },
    select: { ironframeDealId: true },
  });
  const processedSet = new Set(processed.map((row) => row.ironframeDealId));
  const newProspectIds = poll.prospects.filter((p) => !processedSet.has(p.dealId)).map((p) => p.dealId);

  return {
    prospects: poll.prospects,
    newProspectIds,
    error: null,
    ...logStep(`[poll] saw ${poll.prospects.length} prospects; ${newProspectIds.length} new`),
  };
}

/** S-02 — StoryBrand + beachhead draft for each new PROSPECT. */
export async function draftOutreachNode(state: NodeState): Promise<Partial<SalesTeamGraphState>> {
  const defaultChannel = getDefaultOutreachChannel();
  const newSet = new Set(state.newProspectIds ?? []);
  const targets = (state.prospects ?? []).filter((p) => newSet.has(p.dealId));

  const drafts: NonNullable<SalesTeamGraphState['drafts']> = [];
  for (const prospect of targets) {
    const route = routeProspectChannel(
      (prospect.industrySector ?? 'REGIONAL_BHC') as BeachheadSector,
      Boolean(prospect.phone),
      defaultChannel,
    );
    const cadence = planProspectCadence(prospect.priorityScore, route.channel);
    const draft = draftOutboundMessage(prospect, route.channel);
    const body =
      route.channel === 'SMS' ? buildSmsBody(draft.body, route.channel) : draft.body;

    drafts.push({
      dealId: prospect.dealId,
      contactId: prospect.contactId,
      channel: route.channel,
      subject: draft.subject,
      body,
      industrySector: draft.industrySector,
      lossExposureCents: draft.lossExposureCents,
      shipped: false,
    });

    drafts[drafts.length - 1]!.body += `\n\n[Cadence: ${cadence.rationale}]`;
  }

  return {
    drafts,
    ...logStep(`[draftsman] composed ${drafts.length} pending-review drafts`),
  };
}

/** S-03 — queue drafts via signed ingress (human approval required before send). */
export async function queueApprovalNode(state: NodeState): Promise<Partial<SalesTeamGraphState>> {
  const { targetTenantSlug } = getIngressConfig();
  const prisma = getSalesTeamPrisma();
  const drafts = [...(state.drafts ?? [])];

  for (let i = 0; i < drafts.length; i++) {
    const draft = drafts[i]!;
    try {
      const result = await submitOutreachDraft({
        tenantSlug: targetTenantSlug,
        dealId: draft.dealId,
        contactId: draft.contactId,
        channel: draft.channel,
        subject: draft.subject,
        body: draft.body,
        industrySector: draft.industrySector as BeachheadSector,
        lossExposureCents: draft.lossExposureCents,
      });

      if (!result.ok) {
        drafts[i] = { ...draft, shipped: false, error: result.message };
        await prisma.processedDeal.create({
          data: {
            ironframeDealId: draft.dealId,
            tenantId: state.prospects?.find((p) => p.dealId === draft.dealId)?.tenantId ?? 'unknown',
            contactId: draft.contactId,
            channel: draft.channel,
            status: 'FAILED',
            errorMessage: result.message,
          },
        });
        continue;
      }

      drafts[i] = { ...draft, shipped: true, interactionId: result.interactionId };
      await prisma.processedDeal.create({
        data: {
          ironframeDealId: draft.dealId,
          tenantId: state.prospects?.find((p) => p.dealId === draft.dealId)?.tenantId ?? 'unknown',
          contactId: draft.contactId,
          channel: draft.channel,
          status: 'DRAFT_QUEUED',
          interactionId: result.interactionId,
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'queue failed';
      drafts[i] = { ...draft, shipped: false, error: message };
    }
  }

  const shipped = drafts.filter((d) => d.shipped).length;
  return {
    drafts,
    ...logStep(`[queue] ${shipped}/${drafts.length} drafts queued for human review`),
  };
}
