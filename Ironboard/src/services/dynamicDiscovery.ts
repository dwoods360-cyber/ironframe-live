import {
  planDiscoveryExecution,
  type DiscoveryContext,
  type DiscoveryPlan,
  type DiscoveryToolCall,
} from '../boardRouter.js';
import { manageCrmPipeline } from '../tools/crmTools.js';
import { queryLocalWorkspace } from './queryLocalWorkspace.js';

export type DiscoveryReceipt = {
  purpose: string;
  tool: DiscoveryToolCall['tool'];
  args: Record<string, unknown>;
  ok: boolean;
  empty: boolean;
  payload: Record<string, unknown>;
};

function isEmptyPayload(call: DiscoveryToolCall, payload: Record<string, unknown>): boolean {
  if (payload.ok === false) return false;

  if (call.tool === 'manageCrmPipeline') {
    const action = String(call.args.action ?? '');
    if (action === 'list_sales_playbooks') {
      const playbooks = payload.playbooks as unknown[] | undefined;
      return !playbooks?.length;
    }
    if (action === 'list_pipeline') {
      const pipeline = payload.pipeline as
        | { deals?: unknown[]; contacts?: unknown[]; interactions?: unknown[] }
        | undefined;
      return !(
        pipeline?.deals?.length ||
        pipeline?.contacts?.length ||
        pipeline?.interactions?.length
      );
    }
  }

  if (call.tool === 'queryLocalWorkspace') {
    return Number(payload.count ?? 0) === 0;
  }

  return false;
}

export async function executeDiscoveryToolCall(call: DiscoveryToolCall): Promise<DiscoveryReceipt> {
  const payload =
    call.tool === 'queryLocalWorkspace'
      ? await queryLocalWorkspace(call.args)
      : await manageCrmPipeline(call.args);

  return {
    purpose: call.purpose,
    tool: call.tool,
    args: call.args,
    ok: payload.ok !== false,
    empty: isEmptyPayload(call, payload),
    payload,
  };
}

export async function runDynamicDiscovery(
  query: string,
  ctx: DiscoveryContext = {},
): Promise<{ plan: DiscoveryPlan; receipts: DiscoveryReceipt[] }> {
  const plan = planDiscoveryExecution(query, ctx);
  const receipts = await Promise.all(plan.toolCalls.map(executeDiscoveryToolCall));
  return { plan, receipts };
}

export function formatDiscoveryEvidence(receipts: DiscoveryReceipt[]): string {
  if (!receipts.length) return 'No discovery tools were dispatched for this query class.';
  return receipts
    .map(receipt =>
      JSON.stringify(
        {
          tool: receipt.tool,
          purpose: receipt.purpose,
          args: receipt.args,
          ok: receipt.ok,
          empty: receipt.empty,
          payload: receipt.payload,
        },
        null,
        2,
      ),
    )
    .join('\n\n');
}

export function summarizeEmptyDiscoveryStates(receipts: DiscoveryReceipt[]): string[] {
  return receipts
    .filter(receipt => receipt.ok && receipt.empty)
    .map(
      receipt =>
        `${receipt.tool} (${receipt.purpose}): subsystem verified — feature is provisioned but currently has zero populated records.`,
    );
}

export function summarizeDiscoveryFailures(receipts: DiscoveryReceipt[]): string[] {
  return receipts
    .filter(receipt => !receipt.ok)
    .map(receipt => {
      const message =
        typeof receipt.payload.error === 'string'
          ? receipt.payload.error
          : 'Discovery tool returned a failure without an error message.';
      return `${receipt.tool} (${receipt.purpose}): ${message}`;
    });
}

function playbookReceipt(receipts: DiscoveryReceipt[]): DiscoveryReceipt | undefined {
  return receipts.find(
    receipt =>
      receipt.tool === 'manageCrmPipeline' && receipt.args.action === 'list_sales_playbooks',
  );
}

/** Tool-anchored CRM capability summary — derived from live manageCrmPipeline receipts, not static maps. */
export function synthesizeCrmCapabilityFromDiscovery(
  query: string,
  receipts: DiscoveryReceipt[],
): string | null {
  const q = query.trim().toLowerCase();
  if (
    !q.includes('crm') &&
    !q.includes('contact management') &&
    !q.includes('sales pipeline') &&
    !q.includes('deal pipeline')
  ) {
    return null;
  }

  const receipt = playbookReceipt(receipts);
  if (!receipt) return null;

  if (!receipt.ok) {
    return `CRM discovery attempted via manageCrmPipeline but verification failed: ${String(receipt.payload.error ?? 'unknown error')}. Do not claim the platform lacks CRM until discovery succeeds.`;
  }

  const playbooks = receipt.payload.playbooks as
    | Array<{ id: string; title: string }>
    | undefined;

  if (!playbooks?.length) {
    return 'Discovery reached manageCrmPipeline successfully; the CRM subsystem is provisioned but the sales methodology corpus returned zero playbooks (awaiting hydration). IronBoard still exposes tenant-scoped B2B contacts, interaction logging, and deal pipeline tools.';
  }

  const pipelineReceipt = receipts.find(receipt => receipt.args.action === 'list_pipeline');
  let pipelineNote =
    'Supply tenantId on list_pipeline to inspect live deal and contact counts for your workspace.';
  if (pipelineReceipt?.ok) {
    pipelineNote = pipelineReceipt.empty
      ? 'Tenant CRM pipeline verified: subsystem is live but currently has no deals, contacts, or logged interactions.'
      : (() => {
          const pipeline = pipelineReceipt.payload.pipeline as
            | { deals?: unknown[]; contacts?: unknown[]; interactions?: unknown[] }
            | undefined;
          return `Tenant CRM pipeline verified: ${pipeline?.deals?.length ?? 0} deal(s), ${pipeline?.contacts?.length ?? 0} contact(s), ${pipeline?.interactions?.length ?? 0} interaction(s).`;
        })();
  }

  const methodologyNames = playbooks.map(playbook => playbook.title).join(', ');
  return [
    'Yes — discovery confirmed IronBoard possesses an embedded, tenant-isolated CRM (manageCrmPipeline).',
    'Ironframe core handles infrastructure and GRC telemetry; IronBoard provides B2B contact storage, activity logging, and deal pipeline management governed by tenantId row-level limits and BigInt whole-cent financial fields.',
    `Verified sales methodology corpus (${playbooks.length} playbooks): ${methodologyNames}. Outreach and stage moves validate against this corpus (SPIN, Challenger, Tactical Negotiation, and related frameworks).`,
    pipelineNote,
  ].join(' ');
}

export function buildCrmDiscoveryEnrichment(receipts: DiscoveryReceipt[]): string {
  const receipt = playbookReceipt(receipts);
  if (!receipt?.ok) return '';
  const playbooks = receipt.payload.playbooks as unknown[] | undefined;
  const count = playbooks?.length ?? 0;
  if (!count) {
    return 'CRM DISCOVERY VERDICT: manageCrmPipeline is reachable — IronBoard HAS embedded CRM schema; corpus empty. Never answer that Ironframe/IronBoard lacks CRM.';
  }
  return `CRM DISCOVERY VERDICT: manageCrmPipeline list_sales_playbooks returned ${count} playbooks — IronBoard HAS embedded CRM. Ironframe root is GRC infrastructure; CRM lives in IronBoard. Never deny contact management, pipeline tracking, or interaction logging when this receipt is present.`;
}
