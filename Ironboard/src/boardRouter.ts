import {
  AGENTIC_BOARD_ROSTER,
  STRATEGIC_KNOWLEDGE_VAULT,
  type BoardPersona,
} from './staticContext.js';

export const DYNAMIC_DISCOVERY_MANDATE = `
MANDATORY DIRECTIVE — DYNAMIC DISCOVERY ENFORCEMENT:
The Board and its associated routing components are strictly forbidden from hardcoding answers, status reports, summaries, or system profiles. All responses delivered to the user or system interfaces must be dynamically derived via active tool execution, workspace querying, or schema lookups. If a resource, CRM pipeline, metric, or capability is questioned, the engine must actively execute the corresponding discovery tool to verify state before responding. Static prose overrides are treated as structural architectural drift.
`.trim();

export type PanelAssembly = {
  executiveLead: string;
  leadId: string;
  advisoryCouncil: string[];
  alignedPrimaryFramework: string;
};

export type RoutedPanel = {
  isAutoRouted: boolean;
  leader: BoardPersona;
  panel: PanelAssembly;
  cognitivePath: string;
};

export type DiscoveryToolCall = {
  tool: 'manageCrmPipeline' | 'queryLocalWorkspace';
  args: Record<string, unknown>;
  purpose: string;
};

export type DiscoveryPlan = {
  intents: string[];
  toolCalls: DiscoveryToolCall[];
};

export type DiscoveryContext = {
  tenantId?: string;
  activeHub?: string;
  prospectId?: string;
};

function pickAdvisoryCouncil(leader: BoardPersona): string[] {
  const supportStaff = AGENTIC_BOARD_ROSTER.filter(a => a.id !== leader.id);
  return supportStaff.slice(0, 2).map(
    a => `${a.role} [Lens: ${a.primaryBookAlignment}]`,
  );
}

function isCrmIntent(normalizedQuery: string): boolean {
  return (
    normalizedQuery.includes('crm') ||
    normalizedQuery.includes('deal pipeline') ||
    normalizedQuery.includes('contact database') ||
    normalizedQuery.includes('managecrmpipeline') ||
    normalizedQuery.includes('b2b') ||
    (normalizedQuery.includes('sales') &&
      (normalizedQuery.includes('ironboard') ||
        normalizedQuery.includes('pipeline') ||
        normalizedQuery.includes('methodolog')))
  );
}

function isMethodologyIntent(normalizedQuery: string): boolean {
  return (
    normalizedQuery.includes('playbook') ||
    normalizedQuery.includes('methodolog') ||
    normalizedQuery.includes('spin') ||
    normalizedQuery.includes('challenger') ||
    normalizedQuery.includes('tactical negotiation') ||
    normalizedQuery.includes('outreach strateg')
  );
}

function isWorkspaceIntent(normalizedQuery: string): boolean {
  return (
    normalizedQuery.includes('prospect') ||
    normalizedQuery.includes('client') ||
    normalizedQuery.includes('flywheel') ||
    normalizedQuery.includes('outreach history') ||
    normalizedQuery.includes('gtm') ||
    normalizedQuery.includes('market opportunit')
  );
}

function isCapabilityIntent(normalizedQuery: string): boolean {
  return (
    normalizedQuery.includes('capabilit') ||
    normalizedQuery.includes('what can') ||
    normalizedQuery.includes('do you have') ||
    normalizedQuery.includes('does ironboard') ||
    normalizedQuery.includes('system profile') ||
    normalizedQuery.includes('what does ironboard')
  );
}

function pushUniqueToolCall(plan: DiscoveryToolCall[], call: DiscoveryToolCall): void {
  const key = `${call.tool}:${JSON.stringify(call.args)}`;
  if (plan.some(existing => `${existing.tool}:${JSON.stringify(existing.args)}` === key)) return;
  plan.push(call);
}

/** Maps executive intent to mandatory discovery tool calls — no static capability claims. */
export function planDiscoveryExecution(
  query: string,
  ctx: DiscoveryContext = {},
): DiscoveryPlan {
  const normalizedQuery = query.trim().toLowerCase();
  const intents: string[] = [];
  const toolCalls: DiscoveryToolCall[] = [];

  const crm = isCrmIntent(normalizedQuery);
  const methodology = isMethodologyIntent(normalizedQuery);
  const workspace = isWorkspaceIntent(normalizedQuery);
  const capability = isCapabilityIntent(normalizedQuery);

  if (crm || methodology || capability) {
    intents.push('sales_methodology_corpus');
    pushUniqueToolCall(toolCalls, {
      tool: 'manageCrmPipeline',
      args: { action: 'list_sales_playbooks' },
      purpose: 'Verify ingested sales methodology corpus and schema availability',
    });
  }

  if (crm || capability) {
    intents.push('crm_pipeline_state');
    if (ctx.tenantId) {
      pushUniqueToolCall(toolCalls, {
        tool: 'manageCrmPipeline',
        args: { action: 'list_pipeline', tenantId: ctx.tenantId, limit: 50 },
        purpose: 'Verify tenant-scoped CRM pipeline population',
      });
    }
  }

  if (workspace || capability) {
    intents.push('workspace_records');
    pushUniqueToolCall(toolCalls, {
      tool: 'queryLocalWorkspace',
      args: {
        queryType: 'active_prospects',
        limit: 10,
        ...(ctx.activeHub ? { region: ctx.activeHub } : {}),
      },
      purpose: 'Verify live GTM prospect records in workspace database',
    });
  }

  if (workspace && normalizedQuery.includes('outreach')) {
    intents.push('outreach_history');
    pushUniqueToolCall(toolCalls, {
      tool: 'queryLocalWorkspace',
      args: {
        queryType: 'outreach_history',
        limit: 10,
        ...(ctx.prospectId ? { prospectId: ctx.prospectId } : {}),
      },
      purpose: 'Verify outreach interaction history records',
    });
  }

  if (capability && !toolCalls.length) {
    intents.push('platform_capability_probe');
    pushUniqueToolCall(toolCalls, {
      tool: 'manageCrmPipeline',
      args: { action: 'list_sales_playbooks' },
      purpose: 'Baseline capability schema verification',
    });
    pushUniqueToolCall(toolCalls, {
      tool: 'queryLocalWorkspace',
      args: { queryType: 'flywheel_logs', limit: 5 },
      purpose: 'Verify flywheel diagnostic channel availability',
    });
  }

  return { intents, toolCalls };
}

function scoreAgent(agent: BoardPersona, normalizedQuery: string): number {
  let score = 0;
  if (normalizedQuery.includes(agent.id.replace('board-', ''))) score += 5;
  if (agent.expertise.some(s => normalizedQuery.includes(s.toLowerCase()))) score += 3;
  if (normalizedQuery.includes(agent.primaryBookAlignment.toLowerCase())) score += 4;
  const crmIntent = isCrmIntent(normalizedQuery) || isMethodologyIntent(normalizedQuery);
  if (crmIntent && agent.id === 'board-sales-lead') score += 12;
  return score;
}

/** Deterministic panel routing — never delegated to Gemini. */
export function routeExecutivePanel(
  query: string,
  explicitAgentId: string,
): RoutedPanel {
  const normalizedQuery = query.trim().toLowerCase();
  let leader = AGENTIC_BOARD_ROSTER.find(a => a.id === 'board-ceo')!;
  let isAutoRouted = explicitAgentId === 'auto';

  if (explicitAgentId !== 'auto') {
    const override = AGENTIC_BOARD_ROSTER.find(a => a.id === explicitAgentId);
    if (override) leader = override;
    isAutoRouted = false;
  } else {
    let highestScore = 0;
    for (const agent of AGENTIC_BOARD_ROSTER) {
      const score = scoreAgent(agent, normalizedQuery);
      if (score > highestScore) {
        highestScore = score;
        leader = agent;
      }
    }
  }

  const coreBook = STRATEGIC_KNOWLEDGE_VAULT.find(f => f.title === leader.primaryBookAlignment)!;
  const council = pickAdvisoryCouncil(leader);

  return {
    isAutoRouted,
    leader,
    panel: {
      executiveLead: leader.role,
      leadId: leader.id,
      advisoryCouncil: council,
      alignedPrimaryFramework: leader.primaryBookAlignment,
    },
    cognitivePath: `Router selected ${leader.id}; discovery plan required before synthesis (${leader.primaryBookAlignment}).`,
  };
}
