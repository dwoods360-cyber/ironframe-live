import type { LeadStage } from '../../../types/crm.js';
import type {
  ChallengerProfile,
  GapAnalysisProfile,
  SalesAccelerationProfile,
  SalesMethodologyId,
  SalesPlaybookBlueprint,
  SpinMatrix,
  TacticalNegotiationProfile,
} from '../../../types/salesKnowledge.js';

const CONTEXT = 'https://ironframe.ai/schemas/sales-playbook/v1';

const STAGE_ALL: readonly LeadStage[] = [
  'PROSPECT',
  'QUALIFIED',
  'DISCOVERY',
  'PROPOSAL',
  'NEGOTIATION',
  'CLOSED_WON',
  'CLOSED_LOST',
];

const STAGE_DISCOVERY: readonly LeadStage[] = ['QUALIFIED', 'DISCOVERY', 'PROPOSAL'];
const STAGE_NEGOTIATION: readonly LeadStage[] = ['PROPOSAL', 'NEGOTIATION', 'CLOSED_WON'];

function stageGuidance(map: Partial<Record<LeadStage, readonly string[]>>): Readonly<
  Record<LeadStage, readonly string[]>
> {
  const empty: readonly string[] = [];
  return {
    PROSPECT: map.PROSPECT ?? empty,
    QUALIFIED: map.QUALIFIED ?? empty,
    DISCOVERY: map.DISCOVERY ?? empty,
    PROPOSAL: map.PROPOSAL ?? empty,
    NEGOTIATION: map.NEGOTIATION ?? empty,
    CLOSED_WON: map.CLOSED_WON ?? empty,
    CLOSED_LOST: map.CLOSED_LOST ?? empty,
  };
}

const SPIN_MATRIX: SpinMatrix = {
  situation: [
    'Describe the buyer org structure and current tooling landscape.',
    'Document existing compliance / GRC workflow maturity.',
    'Capture budget cycle and procurement constraints.',
  ],
  problem: [
    'Identify explicit pain tied to audit readiness or risk visibility.',
    'Surface operational friction in threat triage or evidence collection.',
    'Quantify time lost to manual reporting or siloed agents.',
  ],
  implication: [
    'Project cost of delayed remediation or failed audit.',
    'Link inaction to regulatory exposure or insurance premium pressure.',
    'Estimate workforce strain if manual processes persist.',
  ],
  needPayoff: [
    'Define measurable outcome if Ironframe closes the gap.',
    'Anchor ROI to whole-cent baseline registers and tenant isolation.',
    'Confirm executive sponsor value narrative for board approval.',
  ],
};

const GAP_MATRIX: GapAnalysisProfile = {
  currentState: [
    'Baseline telemetry noise or ungoverned agent sprawl.',
    'Fragmented CRM / pipeline data without tenant scoping.',
    'Reactive sales motion without diagnostic discovery.',
  ],
  desiredFutureState: [
    'Deterministic pipeline with cents-grade forecasting.',
    'Methodology-aligned outreach with validated playbooks.',
    'Board agents invoking CRM tools with RLS-bound tenantId.',
  ],
  gapMetrics: [
    'Pipeline forecast accuracy (whole-cent variance).',
    'Discovery-to-proposal conversion rate.',
    'Time-to-first-validated commercial insight.',
  ],
  rootCauseHypotheses: [
    'Status-quo tooling lacks structured methodology matrices.',
    'Reps default to relationship selling without gap quantification.',
    'No programmatic validation against SPIN / Challenger schemas.',
  ],
  impactIfUnchanged: [
    'Deals stall in PROSPECT without quantified business gap.',
    'Forecast drift from float-based or unscoped CRM entries.',
    'Agent-generated strategies fail playbook compliance checks.',
  ],
};

const CHALLENGER_MATRIX: ChallengerProfile = {
  commercialInsight: [
    'Publish non-obvious industry benchmark the buyer has not internalized.',
    'Connect GRC posture to peer loss events or premium shifts.',
    'Reframe spend from cost center to sovereign risk reduction.',
  ],
  reframePrompts: [
    'What if your current stack optimizes for compliance theater, not evidence durability?',
    'How would your board react if agent telemetry masked execution strain?',
  ],
  rationalDrowning: [
    'Stack cumulative manual hours × fully loaded cost in cents.',
    'Model breach probability uplift under current control gaps.',
  ],
  emotionalImpact: [
    'Personal risk to CISO / GC if audit findings repeat.',
    'Team burnout from oscillating demo telemetry vs production truth.',
  ],
  statusQuoThreat: [
    'Competitors adopting deterministic agent orchestration first.',
    'Regulator expectations outpacing legacy GRC refresh cycles.',
  ],
  tailoredValueHypothesis: [
    'Tenant-isolated Ironframe plane with WORM evidence and quiet production telemetry.',
    'Gemini board agents grounded in structured CRM + methodology validation.',
  ],
};

const ACCELERATION_MATRIX: SalesAccelerationProfile = {
  hiringProfile: [
    'Coachability score and methodology aptitude over tenure alone.',
    'Demonstrated use of diagnostic questioning in mock discovery.',
  ],
  trainingCadence: [
    'Weekly SPIN matrix reviews on live deals.',
    'Monthly Challenger insight workshop with win/loss forensics.',
  ],
  leadingIndicators: [
    'Qualified meetings booked per rep per week.',
    'Playbook validation pass rate on outreach drafts.',
    'CRM interactions logged within 24h of touch.',
  ],
  laggingIndicators: [
    'Stage-weighted pipeline value in cents (CLOSED_LOST excluded).',
    'Average cycle days PROSPECT → CLOSED_WON.',
    'Win rate on deals with methodology score ≥ 80%.',
  ],
  inboundOutboundAlignment: [
    'Shared tenantId-scoped pipeline between marketing and AE motion.',
    'Identical stage definitions in CRM and board agent tools.',
  ],
  playbookAdherenceChecks: [
    'Every DISCOVERY call maps to ≥3 SPIN sections filled.',
    'PROPOSAL stage requires Gap metrics documented in cents impact.',
  ],
};

const NEGOTIATION_MATRIX: TacticalNegotiationProfile = {
  mirrors: [
    'Repeat last 1–3 words of buyer statement as a question.',
    'Mirror emotional label before countering on price.',
  ],
  calibratedQuestions: [
    'How am I supposed to do that?',
    'What about this does not work for you?',
    'What would you need to see to move forward this quarter?',
  ],
  empathyLabels: [
    'It seems like timeline pressure is coming from audit prep.',
    'It sounds like budget is committed but not yet allocated.',
  ],
  accusationAudit: [
    'You probably think we are just another GRC dashboard.',
    'You may feel our pricing assumes enterprise scale you do not need yet.',
  ],
  noOrientedQuestions: [
    'Is now a bad time to revisit evidence locker requirements?',
    'Have you given up on consolidating agent telemetry this year?',
  ],
  blackSwanSignals: [
    'Unspoken internal champion risk or re-org shadow.',
    'Hidden constraint on data residency or PKI ownership.',
  ],
};

export const SALES_PLAYBOOK_BLUEPRINTS: Readonly<Record<SalesMethodologyId, SalesPlaybookBlueprint>> = {
  challenger_sale: {
    '@context': CONTEXT,
    '@type': 'SalesMethodology',
    id: 'challenger_sale',
    title: 'The Challenger Sale',
    authors: ['Matthew Dixon', 'Brent Adamson'],
    coreConcept:
      'Disruption via commercial insights — teach, tailor, and take control rather than default relationship selling.',
    schemaVersion: '1.0.0',
    applicableStages: STAGE_DISCOVERY,
    matrix: CHALLENGER_MATRIX,
    validationRules: [
      {
        id: 'challenger-insight-present',
        description: 'Outreach must include at least one commercial insight and one reframe.',
        requiredFields: ['commercialInsight', 'reframePrompts'],
        minFilledSections: 2,
      },
    ],
    outreachChecklist: [
      'Lead with insight, not product tour.',
      'Tailor impact to buyer role and tenant context.',
      'Quantify status-quo risk in business terms.',
    ],
    stageGuidance: stageGuidance({
      QUALIFIED: ['Prepare 1–2 teachable insights tied to buyer industry.'],
      DISCOVERY: ['Reframe buyer assumptions before presenting Ironframe capabilities.'],
      PROPOSAL: ['Anchor proposal to insight-led business case, not feature parity.'],
    }),
  },
  spin_selling: {
    '@context': CONTEXT,
    '@type': 'SalesMethodology',
    id: 'spin_selling',
    title: 'SPIN Selling',
    authors: ['Neil Rackham'],
    coreConcept:
      'Large-deal success follows Situation, Problem, Implication, and Need-payoff questioning — not feature pitches.',
    schemaVersion: '1.0.0',
    applicableStages: STAGE_DISCOVERY,
    matrix: SPIN_MATRIX,
    validationRules: [
      {
        id: 'spin-four-quadrants',
        description: 'Discovery outreach must touch all four SPIN quadrants.',
        requiredFields: ['situation', 'problem', 'implication', 'needPayoff'],
        minFilledSections: 4,
      },
    ],
    outreachChecklist: [
      'Open with situation facts already verified.',
      'Convert problems into implied costs before need-payoff.',
      'Close with buyer-stated payoff, not vendor claims.',
    ],
    stageGuidance: stageGuidance({
      DISCOVERY: ['Complete SPIN matrix before advancing to PROPOSAL.'],
      PROPOSAL: ['Map each proposal line item to a documented need-payoff.'],
    }),
  },
  gap_selling: {
    '@context': CONTEXT,
    '@type': 'SalesMethodology',
    id: 'gap_selling',
    title: 'Gap Selling',
    authors: ['Keenan'],
    coreConcept:
      'Diagnose the measurable gap between current state and desired future state — sell the problem, not the product.',
    schemaVersion: '1.0.0',
    applicableStages: STAGE_DISCOVERY,
    matrix: GAP_MATRIX,
    validationRules: [
      {
        id: 'gap-states-defined',
        description: 'Strategy must define current state, future state, and ≥1 gap metric.',
        requiredFields: ['currentState', 'desiredFutureState', 'gapMetrics'],
        minFilledSections: 3,
      },
    ],
    outreachChecklist: [
      'Document current state with verifiable facts.',
      'Quantify gap metrics in operational and financial terms.',
      'Tie root cause to buyer-owned process, not vendor blame.',
    ],
    stageGuidance: stageGuidance({
      QUALIFIED: ['Draft preliminary gap hypothesis before first meeting.'],
      DISCOVERY: ['Validate gap metrics with buyer stakeholders.'],
      PROPOSAL: ['Proposal must close the documented gap only.'],
    }),
  },
  sales_acceleration_formula: {
    '@context': CONTEXT,
    '@type': 'SalesMethodology',
    id: 'sales_acceleration_formula',
    title: 'The Sales Acceleration Formula',
    authors: ['Mark Roberge'],
    coreConcept:
      'Scalable revenue through data-driven hiring, training, and aligned inbound/outbound metrics.',
    schemaVersion: '1.0.0',
    applicableStages: STAGE_ALL,
    matrix: ACCELERATION_MATRIX,
    validationRules: [
      {
        id: 'acceleration-metrics',
        description: 'Pipeline review must reference leading and lagging indicators.',
        requiredFields: ['leadingIndicators', 'laggingIndicators'],
        minFilledSections: 2,
      },
    ],
    outreachChecklist: [
      'Log CRM interactions for metric completeness.',
      'Tag outreach with leading indicator category.',
      'Review lagging pipeline cents weekly.',
    ],
    stageGuidance: stageGuidance({
      PROSPECT: ['Track source channel and time-to-first-touch.'],
      QUALIFIED: ['Confirm leading indicators before advancing stage.'],
      CLOSED_WON: ['Capture lagging win metrics for playbook tuning.'],
    }),
  },
  never_split_the_difference: {
    '@context': CONTEXT,
    '@type': 'SalesMethodology',
    id: 'never_split_the_difference',
    title: 'Never Split the Difference',
    authors: ['Chris Voss'],
    coreConcept:
      'Tactical empathy, calibrated questions, and behavioral negotiation — avoid compromise splits on value.',
    schemaVersion: '1.0.0',
    applicableStages: STAGE_NEGOTIATION,
    matrix: NEGOTIATION_MATRIX,
    validationRules: [
      {
        id: 'negotiation-empathy-first',
        description: 'Negotiation touch must include empathy label or calibrated question.',
        requiredFields: ['empathyLabels', 'calibratedQuestions'],
        minFilledSections: 1,
      },
    ],
    outreachChecklist: [
      'Use accusation audit early in high-stakes threads.',
      'Prefer no-oriented questions to reduce defensiveness.',
      'Never split difference on cents — trade scoped value instead.',
    ],
    stageGuidance: stageGuidance({
      NEGOTIATION: ['Lead with tactical empathy before counter-proposals.'],
      CLOSED_WON: ['Confirm implementation fears with calibrated follow-ups.'],
    }),
  },
};

export const SALES_PLAYBOOK_CATALOG = Object.values(SALES_PLAYBOOK_BLUEPRINTS);

export function getSalesPlaybook(id: SalesMethodologyId): SalesPlaybookBlueprint {
  return SALES_PLAYBOOK_BLUEPRINTS[id];
}

export function listSalesPlaybookSummaries(): ReadonlyArray<{
  id: SalesMethodologyId;
  title: string;
  authors: readonly string[];
  coreConcept: string;
  applicableStages: readonly LeadStage[];
}> {
  return SALES_PLAYBOOK_CATALOG.map(playbook => ({
    id: playbook.id,
    title: playbook.title,
    authors: playbook.authors,
    coreConcept: playbook.coreConcept,
    applicableStages: playbook.applicableStages,
  }));
}
