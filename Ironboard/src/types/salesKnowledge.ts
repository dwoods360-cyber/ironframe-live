import type { LeadStage } from './crm.js';

/** Immutable identifier for each ingested sales methodology corpus entry. */
export const SALES_METHODOLOGY_IDS = [
  'challenger_sale',
  'spin_selling',
  'gap_selling',
  'sales_acceleration_formula',
  'never_split_the_difference',
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
  readonly leadingIndicators: readonly string[];
  readonly laggingIndicators: readonly string[];
  readonly inboundOutboundAlignment: readonly string[];
  readonly playbookAdherenceChecks: readonly string[];
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
  | TacticalNegotiationProfile;

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
  return 'leadingIndicators' in matrix && 'laggingIndicators' in matrix;
}

export function isTacticalNegotiationProfile(
  matrix: MethodologyMatrix,
): matrix is TacticalNegotiationProfile {
  return 'mirrors' in matrix && 'calibratedQuestions' in matrix;
}
