/**
 * Six-credit doctrine vault — methodology lenses only (no copyrighted book text).
 * Canonical spine for IronBoard + perimeter workers (Ironleads, SalesTeam, SuccessTeam, SupportTeam).
 */
export type DoctrinePillarId =
  | 'quantitative_risk_modeling'
  | 'agentic_architecture_guardrails'
  | 'enterprise_b2b_positioning'
  | 'founder_led_saas_sales';

export type DoctrineCreditPhase = 1 | 2 | 3;

export type DoctrineWorkerId =
  | 'ironboard'
  | 'ironleads'
  | 'salesteam'
  | 'success-team'
  | 'support-team';

export type DoctrineCreditEntry = {
  readonly credit: 1 | 2 | 3 | 4 | 5 | 6;
  readonly title: string;
  readonly author: string;
  readonly pillar: DoctrinePillarId;
  readonly phase: DoctrineCreditPhase;
  readonly coreConcepts: readonly string[];
  /** Ironframe-bound operating rules derived from the methodology — never verbatim excerpts. */
  readonly strategicInvariants: string;
  readonly boardPersonaIds: readonly string[];
  /** Perimeter workers that should load this credit as primary doctrine. */
  readonly workerIds: readonly DoctrineWorkerId[];
};

export const DOCTRINE_PILLAR_LABELS: Readonly<Record<DoctrinePillarId, string>> = {
  quantitative_risk_modeling: 'Quantitative risk modeling',
  agentic_architecture_guardrails: 'Agentic architecture & guardrails',
  enterprise_b2b_positioning: 'Enterprise B2B positioning',
  founder_led_saas_sales: 'Founder-led SaaS sales',
};

export const SIX_CREDIT_DOCTRINE_VAULT: readonly DoctrineCreditEntry[] = [
  {
    credit: 1,
    title: 'How to Measure Anything in Cybersecurity Risk',
    author: 'Douglas W. Hubbard & Richard Seiersen',
    pillar: 'quantitative_risk_modeling',
    phase: 2,
    coreConcepts: [
      'Calibrated probabilistic ranges',
      'Loss exceedance curves',
      'Replace subjective 5×5 heatmaps',
      'Whole-cents loss models',
    ],
    strategicInvariants:
      'Board risk claims use calibrated ranges and reproducible ALE math in BigInt cents — never heatmap theater or invented point precision.',
    boardPersonaIds: ['board-risk-spec', 'board-cfo'],
    workerIds: ['ironboard', 'ironleads', 'success-team'],
  },
  {
    credit: 2,
    title: 'The Qualified Sales Leader',
    author: 'John McMahon',
    pillar: 'founder_led_saas_sales',
    phase: 1,
    coreConcepts: [
      'MEDDPICC qualification',
      'Pipeline inspection rigor',
      'Champion + Economic Buyer dual-threading',
      'Pilot-to-enterprise conversion',
    ],
    strategicInvariants:
      'Advance Path B deals only when Metrics, Economic Buyer, Decision process/criteria, Paper process, Identify pain, Champion, and Competition are evidenced — workflow-review CTA, never demo theater.',
    boardPersonaIds: ['board-sales-lead', 'board-ceo'],
    workerIds: ['ironboard', 'ironleads', 'salesteam'],
  },
  {
    credit: 3,
    title: 'The Alignment Problem',
    author: 'Brian Christian',
    pillar: 'agentic_architecture_guardrails',
    phase: 3,
    coreConcepts: [
      'Goal-directed agent failure modes',
      'Reward hacking',
      'Verification gates',
      'Deterministic guardrails',
    ],
    strategicInvariants:
      'Multi-agent workflows require Irongate ingress, tenant isolation, HITL verification gates, and Ironethic/Ironguard checks — never trust unconstrained agent goals.',
    boardPersonaIds: ['board-cto', 'board-bot'],
    workerIds: ['ironboard', 'support-team', 'success-team'],
  },
  {
    credit: 4,
    title: 'Obviously Awesome',
    author: 'April Dunford',
    pillar: 'enterprise_b2b_positioning',
    phase: 1,
    coreConcepts: [
      'Competitive alternatives',
      'Unique attributes',
      'Value themes',
      'Market category',
      'Segment focus',
    ],
    strategicInvariants:
      'Position against spreadsheets and heatmap GRC incumbents; tailor value themes per beachhead (BHC, NERC, MSSP, HIPAA) without claiming market leadership.',
    boardPersonaIds: ['board-evangelist', 'board-marketing-mgr'],
    workerIds: ['ironboard', 'ironleads', 'salesteam'],
  },
  {
    credit: 5,
    title: 'Superforecasting',
    author: 'Philip E. Tetlock & Dan Gardner',
    pillar: 'quantitative_risk_modeling',
    phase: 2,
    coreConcepts: [
      'Calibrated probability estimates',
      'Sparse-data forecasting',
      'Base rates and update discipline',
      'Defensible uncertainty bands',
    ],
    strategicInvariants:
      'Defend loss-exposure assumptions to client boards with base rates, stated uncertainty, and update trails — never overconfident single-point forecasts.',
    boardPersonaIds: ['board-data-sci', 'board-risk-spec'],
    workerIds: ['ironboard', 'success-team'],
  },
  {
    credit: 6,
    title: 'Thinking in Systems: A Primer',
    author: 'Donella H. Meadows',
    pillar: 'agentic_architecture_guardrails',
    phase: 3,
    coreConcepts: [
      'Feedback loops',
      'Stocks and flows',
      'Delay and oscillation',
      'Leverage points',
    ],
    strategicInvariants:
      'Orchestrate autonomous workflows with explicit feedback delays, isolation boundaries, and failure containment — prevent cascading multi-tenant state bleed.',
    boardPersonaIds: ['board-engineer', 'board-pm'],
    workerIds: ['ironboard', 'support-team', 'success-team'],
  },
] as const;

export const SIX_CREDIT_LISTENING_SEQUENCE: ReadonlyArray<{
  readonly phase: DoctrineCreditPhase;
  readonly label: string;
  readonly creditIds: readonly (1 | 2 | 3 | 4 | 5 | 6)[];
  readonly mandate: string;
}> = [
  {
    phase: 1,
    label: 'GTM & Positioning',
    creditIds: [2, 4],
    mandate:
      'Sharpen Design Partner hooks, MEDDPICC qualification, and control-first category language while HITL outreach runs.',
  },
  {
    phase: 2,
    label: 'Product Rigor & Risk Translation',
    creditIds: [1, 5],
    mandate:
      'Present defensible loss ranges, assumptions, and exposure hours to non-technical executives in BigInt-cents math.',
  },
  {
    phase: 3,
    label: 'Agentic Guardrails & Architecture',
    creditIds: [3, 6],
    mandate:
      'Strengthen agent isolation, deterministic gate checks, and multi-tenant anomaly containment models.',
  },
] as const;

/** Primary credits loaded into each perimeter worker prompt surface. */
export const WORKER_SIX_CREDIT_FOCUS: Readonly<
  Record<DoctrineWorkerId, readonly (1 | 2 | 3 | 4 | 5 | 6)[]>
> = {
  ironboard: [1, 2, 3, 4, 5, 6],
  ironleads: [2, 4, 1],
  salesteam: [2, 4],
  'success-team': [1, 5, 6, 3],
  'support-team': [3, 6],
};

export function listSixCreditVaultTitles(): readonly string[] {
  return SIX_CREDIT_DOCTRINE_VAULT.map((c) => c.title);
}

export function creditsForWorker(workerId: DoctrineWorkerId): readonly DoctrineCreditEntry[] {
  const focus = new Set(WORKER_SIX_CREDIT_FOCUS[workerId]);
  return SIX_CREDIT_DOCTRINE_VAULT.filter((c) => focus.has(c.credit));
}

export function buildSixCreditDoctrineBinding(): string {
  const creditLines = SIX_CREDIT_DOCTRINE_VAULT.map(
    (c) =>
      `#${c.credit} ${c.title} (${c.author}) — pillar=${DOCTRINE_PILLAR_LABELS[c.pillar]} | phase=${c.phase} | personas=${c.boardPersonaIds.join(', ')} | workers=${c.workerIds.join(', ')}\n  Concepts: ${c.coreConcepts.join('; ')}\n  Ironframe invariant: ${c.strategicInvariants}`,
  ).join('\n');

  const phaseLines = SIX_CREDIT_LISTENING_SEQUENCE.map(
    (p) =>
      `Phase ${p.phase} — ${p.label} (credits ${p.creditIds.join(' & ')}): ${p.mandate}`,
  ).join('\n');

  return `
SIX-CREDIT DOCTRINE VAULT (METHODOLOGY LENSES ONLY — NO BOOK EXCERPTS):
Copyrighted works are cited by title/author as operating doctrine. Never paste or paraphrase long passages.
Allocate reasoning across pillars: quantitative risk, agentic guardrails, B2B positioning, founder-led SaaS sales.

${creditLines}

LISTENING / STUDY SEQUENCE (active Path B GTM):
${phaseLines}

CITATION RULE: Strategy vault books are planning lenses — never proof of current market leadership or shipped capability.
`.trim();
}

/** Compact worker-scoped doctrine block for Ops Hub chat + perimeter mandates. */
export function buildWorkerSixCreditMandate(workerId: DoctrineWorkerId): string {
  const credits = creditsForWorker(workerId);
  const lines = credits.map(
    (c) =>
      `- Credit #${c.credit} ${c.title}: ${c.strategicInvariants}`,
  );
  return `
SIX-CREDIT DOCTRINE — ${workerId.toUpperCase()} FOCUS (methodology lenses only):
${lines.join('\n')}
Never paste book text. Never cite vault books as market-leadership proof.
`.trim();
}
