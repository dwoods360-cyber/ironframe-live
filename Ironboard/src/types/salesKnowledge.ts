import type { LeadStage } from './crm.js';

/** Immutable identifier for each ingested sales methodology corpus entry. */
export const SALES_METHODOLOGY_IDS = [
  'challenger_sale',
  'spin_selling',
  'gap_selling',
  'sales_acceleration_formula',
  'never_split_the_difference',
  'influence_persuasion',
  'sales_machine',
  'sales_enablement_board',
] as const;

export type SalesMethodologyId = (typeof SALES_METHODOLOGY_IDS)[number];

export type JsonLdNode = {
  readonly '@context': string;
  readonly '@type': string;
};

/** SPIN — Situation, Problem, Implication, Need-payoff questioning matrix. */
export type SpinMatrix = {
  readonly situation: readonly string[];
  readonly problem: readonly string[];
  readonly implication: readonly string[];
  readonly needPayoff: readonly string[];
};

/** Gap Selling — current vs desired state diagnostic profile. */
export type GapAnalysisProfile = {
  readonly currentState: readonly string[];
  readonly desiredFutureState: readonly string[];
  readonly gapMetrics: readonly string[];
  readonly rootCauseHypotheses: readonly string[];
  readonly impactIfUnchanged: readonly string[];
};

/** Challenger Sale — teach, tailor, take control via commercial insight. */
export type ChallengerProfile = {
  readonly commercialInsight: readonly string[];
  readonly reframePrompts: readonly string[];
  readonly rationalDrowning: readonly string[];
  readonly emotionalImpact: readonly string[];
  readonly statusQuoThreat: readonly string[];
  readonly tailoredValueHypothesis: readonly string[];
};

/** Sales Acceleration Formula — scalable revenue engineering metrics. */
export type SalesAccelerationProfile = {
  readonly hiringProfile: readonly string[];
  readonly trainingCadence: readonly string[];
  readonly managingCadence: readonly string[];
  /** Forecast and quota templates — whole-cent integers only, never floats. */
  readonly forecastingInCents: readonly string[];
  readonly leadingIndicators: readonly string[];
  readonly laggingIndicators: readonly string[];
  readonly inboundOutboundAlignment: readonly string[];
  readonly playbookAdherenceChecks: readonly string[];
};

/** Influence — Cialdini six principles as outreach validation triggers. */
export type InfluencePersuasionProfile = {
  readonly reciprocity: readonly string[];
  readonly commitmentConsistency: readonly string[];
  readonly socialProof: readonly string[];
  readonly authority: readonly string[];
  readonly liking: readonly string[];
  readonly scarcity: readonly string[];
};

/** The Sales Machine — Dream 100 and focused time execution. */
export type SalesMachineProfile = {
  readonly dream100Targets: readonly string[];
  readonly timeBlockPlan: readonly string[];
  readonly stadiumPitch: readonly string[];
  readonly buyerPersonas: readonly string[];
  readonly touchCadence: readonly string[];
  readonly pipelineHygiene: readonly string[];
};

/** Sales Enablement: A Board-Level Perspective — governance-aligned ops. */
export type SalesEnablementBoardProfile = {
  readonly boardGovernanceHooks: readonly string[];
  readonly enablementOpsMetrics: readonly string[];
  readonly revenueCommitteeAlignment: readonly string[];
  readonly crossFunctionalAlignment: readonly string[];
  readonly auditTrailRequirements: readonly string[];
  readonly forecastGovernanceInCents: readonly string[];
};

/** Never Split the Difference — tactical negotiation behaviors. */
export type TacticalNegotiationProfile = {
  readonly mirrors: readonly string[];
  readonly calibratedQuestions: readonly string[];
  readonly empathyLabels: readonly string[];
  readonly accusationAudit: readonly string[];
  readonly noOrientedQuestions: readonly string[];
  readonly blackSwanSignals: readonly string[];
};

export type MethodologyMatrix =
  | SpinMatrix
  | GapAnalysisProfile
  | ChallengerProfile
  | SalesAccelerationProfile
  | TacticalNegotiationProfile
  | InfluencePersuasionProfile
  | SalesMachineProfile
  | SalesEnablementBoardProfile;

export type PlaybookValidationRule = {
  readonly id: string;
  readonly description: string;
  readonly requiredFields: readonly string[];
  readonly minFilledSections: number;
};

export type SalesPlaybookBlueprint = JsonLdNode & {
  readonly '@type': 'SalesMethodology';
  readonly id: SalesMethodologyId;
  readonly title: string;
  readonly authors: readonly string[];
  readonly coreConcept: string;
  readonly schemaVersion: '1.0.0';
  readonly applicableStages: readonly LeadStage[];
  readonly matrix: MethodologyMatrix;
  readonly validationRules: readonly PlaybookValidationRule[];
  readonly outreachChecklist: readonly string[];
  readonly stageGuidance: Readonly<Record<LeadStage, readonly string[]>>;
};

/** Agent-submitted outreach strategy payload for methodology validation. */
export type OutreachStrategyDraft = {
  readonly methodologyId: SalesMethodologyId;
  readonly dealId?: string;
  readonly contactId?: string;
  readonly headline: string;
  readonly matrixResponses: Readonly<Record<string, string>>;
  readonly nextActions: readonly string[];
};

/** Result of evaluating agent reasoning against a playbook schema. */
export type MethodologyValidationResult = {
  readonly ok: boolean;
  readonly methodologyId: SalesMethodologyId;
  readonly score: number;
  readonly maxScore: number;
  readonly filledSections: readonly string[];
  readonly missingSections: readonly string[];
  readonly violations: readonly string[];
  readonly recommendations: readonly string[];
};

/** Deal-stage alignment report against a selected methodology. */
export type DealStageEvaluation = {
  readonly ok: boolean;
  readonly methodologyId: SalesMethodologyId;
  readonly dealStage: LeadStage;
  readonly stageFit: 'strong' | 'partial' | 'weak';
  readonly guidance: readonly string[];
  readonly checklist: readonly string[];
  readonly violations: readonly string[];
};

export function isSalesMethodologyId(value: string): value is SalesMethodologyId {
  return (SALES_METHODOLOGY_IDS as readonly string[]).includes(value);
}

export function isSpinMatrix(matrix: MethodologyMatrix): matrix is SpinMatrix {
  return (
    'situation' in matrix &&
    'problem' in matrix &&
    'implication' in matrix &&
    'needPayoff' in matrix
  );
}

export function isGapAnalysisProfile(matrix: MethodologyMatrix): matrix is GapAnalysisProfile {
  return 'currentState' in matrix && 'desiredFutureState' in matrix && 'gapMetrics' in matrix;
}

export function isChallengerProfile(matrix: MethodologyMatrix): matrix is ChallengerProfile {
  return 'commercialInsight' in matrix && 'reframePrompts' in matrix;
}

export function isSalesAccelerationProfile(
  matrix: MethodologyMatrix,
): matrix is SalesAccelerationProfile {
  return 'hiringProfile' in matrix && 'forecastingInCents' in matrix;
}

export function isInfluencePersuasionProfile(
  matrix: MethodologyMatrix,
): matrix is InfluencePersuasionProfile {
  return 'reciprocity' in matrix && 'scarcity' in matrix && 'socialProof' in matrix;
}

export function isSalesMachineProfile(matrix: MethodologyMatrix): matrix is SalesMachineProfile {
  return 'dream100Targets' in matrix && 'timeBlockPlan' in matrix;
}

export function isSalesEnablementBoardProfile(
  matrix: MethodologyMatrix,
): matrix is SalesEnablementBoardProfile {
  return 'boardGovernanceHooks' in matrix && 'forecastGovernanceInCents' in matrix;
}

export function isTacticalNegotiationProfile(
  matrix: MethodologyMatrix,
): matrix is TacticalNegotiationProfile {
  return 'mirrors' in matrix && 'calibratedQuestions' in matrix;
}
