import { auditAccountHealth } from '../agents/healthAuditor.js';
import { quantifyAccountValue } from '../agents/valueQuantifier.js';
import { findExpansionMotion } from '../agents/expansionFinder.js';
import { composeAdvisoryDraft } from '../agents/advisoryGatekeeper.js';
import { pollAccountsQueue } from '../lib/accountsPollClient.js';
import { fetchHealthSnapshot } from '../lib/healthSnapshotClient.js';
import { submitAdvisoryDraft } from '../lib/advisoryIngressClient.js';
import { getSuccessTeamPrisma } from '../lib/prisma.js';
import { getIngressConfig } from '../loadSuccessTeamEnv.js';
import { fingerprintHealthAuditorSuccess, LKG_HEALTH_AUDITOR_SUCCESS } from './lkg.js';
import type { SuccessTeamGraphState } from './state.js';

type NodeState = Partial<SuccessTeamGraphState>;

function logStep(message: string): { pipelineLog: string[] } {
  return { pipelineLog: [message] };
}

/** ST-POLL — fetch CLOSED_WON accounts from Ironframe ingress. */
export async function pollAccountsNode(state: NodeState): Promise<Partial<SuccessTeamGraphState>> {
  const poll = await pollAccountsQueue(50);
  if (!poll.ok) {
    return {
      accounts: [],
      newAccountIds: [],
      error: poll.message,
      ...logStep(`[poll] failed: ${poll.message}`),
    };
  }

  const prisma = getSuccessTeamPrisma();
  const processed = await prisma.processedAccount.findMany({
    where: { ironframeDealId: { in: poll.accounts.map((a) => a.dealId) } },
    select: { ironframeDealId: true },
  });
  const processedSet = new Set(processed.map((row) => row.ironframeDealId));
  const newAccountIds = poll.accounts
    .filter((a) => !processedSet.has(a.dealId))
    .map((a) => a.dealId);

  return {
    accounts: poll.accounts,
    newAccountIds,
    error: null,
    ...logStep(`[poll] saw ${poll.accounts.length} accounts; ${newAccountIds.length} new`),
  };
}

/** ST-01 healthAuditor — snapshot + deterministic audit per new account. */
export async function healthAuditorNode(state: NodeState): Promise<Partial<SuccessTeamGraphState>> {
  if (state.error) return {};

  const newSet = new Set(state.newAccountIds ?? []);
  const targets = (state.accounts ?? []).filter((a) => newSet.has(a.dealId));
  const snapshots: Record<string, NonNullable<SuccessTeamGraphState['snapshots']>[string]> = {};

  for (const account of targets) {
    const result = await fetchHealthSnapshot(account.dealId);
    if (!result.ok) {
      return {
        error: result.message,
        ...logStep(`[healthAuditor] snapshot failed for ${account.dealId}`),
      };
    }
    snapshots[account.dealId] = result.snapshot;
    auditAccountHealth(account, result.snapshot);
  }

  const fingerprint = fingerprintHealthAuditorSuccess({
    accounts: state.accounts,
    snapshots,
  });

  return {
    snapshots,
    lastKnownGoodNode: fingerprint ? LKG_HEALTH_AUDITOR_SUCCESS : state.lastKnownGoodNode ?? null,
    ...logStep(`[healthAuditor] audited ${targets.length} accounts`),
  };
}

/** ST-02 valueQuantifier — BigInt ROI narratives. */
export async function valueQuantifierNode(state: NodeState): Promise<Partial<SuccessTeamGraphState>> {
  if (state.error) return {};
  const newSet = new Set(state.newAccountIds ?? []);
  const targets = (state.accounts ?? []).filter((a) => newSet.has(a.dealId));

  for (const account of targets) {
    const snapshot = state.snapshots?.[account.dealId];
    if (!snapshot) continue;
    const audit = auditAccountHealth(account, snapshot);
    quantifyAccountValue(audit);
  }

  return { ...logStep(`[valueQuantifier] quantified ${targets.length} accounts`) };
}

/** ST-03 expansionFinder — retention vs expansion routing. */
export async function expansionFinderNode(state: NodeState): Promise<Partial<SuccessTeamGraphState>> {
  if (state.error) return {};
  const newSet = new Set(state.newAccountIds ?? []);
  const targets = (state.accounts ?? []).filter((a) => newSet.has(a.dealId));

  for (const account of targets) {
    const snapshot = state.snapshots?.[account.dealId];
    if (!snapshot) continue;
    const audit = auditAccountHealth(account, snapshot);
    const value = quantifyAccountValue(audit);
    findExpansionMotion(audit, value);
  }

  return { ...logStep(`[expansionFinder] classified ${targets.length} accounts`) };
}

/** ST-04 advisoryGatekeeper — compose + queue advisories (HITL). */
export async function advisoryGatekeeperNode(
  state: NodeState,
): Promise<Partial<SuccessTeamGraphState>> {
  if (state.error) return {};

  const { targetTenantSlug } = getIngressConfig();
  const prisma = getSuccessTeamPrisma();
  const newSet = new Set(state.newAccountIds ?? []);
  const targets = (state.accounts ?? []).filter((a) => newSet.has(a.dealId));
  const advisories: NonNullable<SuccessTeamGraphState['advisories']> = [];

  for (const account of targets) {
    const snapshot = state.snapshots?.[account.dealId];
    if (!snapshot) continue;

    const audit = auditAccountHealth(account, snapshot);
    const value = quantifyAccountValue(audit);
    const finding = findExpansionMotion(audit, value);
    const draft = await composeAdvisoryDraft(audit, value, finding);

    try {
      const result = await submitAdvisoryDraft({
        tenantSlug: targetTenantSlug,
        dealId: draft.dealId,
        contactId: draft.contactId,
        advisoryType: draft.advisoryType,
        subject: draft.subject,
        body: draft.body,
        industrySector: draft.industrySector,
        healthScore: draft.healthScore,
        healthBand: draft.healthBand,
        valueCents: draft.valueCents,
        corpusPlayIds: draft.corpusPlayIds,
      });

      if (!result.ok) {
        advisories.push({ ...draft, shipped: false, error: result.message });
        await prisma.processedAccount.create({
          data: {
            ironframeDealId: account.dealId,
            tenantId: account.tenantId,
            contactId: account.contactId,
            advisoryType: draft.advisoryType,
            healthBand: draft.healthBand,
            status: 'FAILED',
            errorMessage: result.message,
          },
        });
        continue;
      }

      advisories.push({ ...draft, shipped: true, interactionId: result.interactionId });
      await prisma.processedAccount.create({
        data: {
          ironframeDealId: account.dealId,
          tenantId: account.tenantId,
          contactId: account.contactId,
          advisoryType: draft.advisoryType,
          healthBand: draft.healthBand,
          status: 'ADVISORY_QUEUED',
          interactionId: result.interactionId,
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'advisory queue failed';
      advisories.push({ ...draft, shipped: false, error: message });
    }
  }

  const shipped = advisories.filter((a) => a.shipped).length;
  return {
    advisories,
    ...logStep(`[advisoryGatekeeper] ${shipped}/${advisories.length} advisories queued for human review`),
  };
}
