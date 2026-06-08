import {
  AGENTIC_BOARD_ROSTER,
  STRATEGIC_KNOWLEDGE_VAULT,
  type BoardPersona,
} from './staticContext.js';

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

function pickAdvisoryCouncil(leader: BoardPersona): string[] {
  const supportStaff = AGENTIC_BOARD_ROSTER.filter(a => a.id !== leader.id);
  return supportStaff.slice(0, 2).map(
    a => `${a.role} [Lens: ${a.primaryBookAlignment}]`,
  );
}

function scoreAgent(agent: BoardPersona, normalizedQuery: string): number {
  let score = 0;
  if (normalizedQuery.includes(agent.id.replace('board-', ''))) score += 5;
  if (agent.expertise.some(s => normalizedQuery.includes(s.toLowerCase()))) score += 3;
  if (normalizedQuery.includes(agent.primaryBookAlignment.toLowerCase())) score += 4;
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
    cognitivePath: `Consensus router identified intent. Selected ${leader.role} leveraging framework: "${coreBook.strategicInvariants}"`,
  };
}
