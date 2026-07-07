/**
 * Shared CRM lead priority scoring for Next.js app routes (webpack-safe — no Ironboard `.js` imports).
 * P = (S_beachhead × 0.35) + (M_pain × 0.30) + (T_trigger × 0.20) + (C_methodology × 0.15)
 */

export const BEACHHEAD_SECTORS = [
  "REGIONAL_BHC",
  "UTILITY_NERC",
  "MSSP_ENCLAVE",
  "HEALTH_HIPAA",
  "UNCLASSIFIED",
] as const;

export type BeachheadSector = (typeof BEACHHEAD_SECTORS)[number];

export const TRIGGER_SIGNALS = [
  "REG_FINE",
  "NEW_CISO",
  "M_AND_A",
  "COMPLIANCE_JOB_POST",
  "BOARD_MANDATE_DOLLAR_RISK",
] as const;

export type TriggerSignal = (typeof TRIGGER_SIGNALS)[number];

export type PainMarkers = {
  manualBoardReporting?: boolean;
  noDollarRiskQuant?: boolean;
  fragmentedGrc?: boolean;
  multiEntityGovernance?: boolean;
};

export type MethodologyMarkers = {
  commercialInsightDelivered?: boolean;
  spinSituationReduced?: boolean;
};

export type QualificationSignals = {
  beachheadScore: number;
  painScore: number;
  triggerScore: number;
  methodologyScore: number;
  priorityWeight: number;
  painMarkers?: PainMarkers;
  triggers?: TriggerSignal[];
  methodology?: MethodologyMarkers;
  computedAt: string;
};

export type QualificationInput = {
  industrySector?: BeachheadSector | null;
  detectedTrigger?: string | null;
  painMarkers?: PainMarkers;
  triggers?: TriggerSignal[];
  methodology?: MethodologyMarkers;
};

const BEACHHEAD_SCORE: Record<BeachheadSector, number> = {
  REGIONAL_BHC: 1,
  UTILITY_NERC: 1,
  MSSP_ENCLAVE: 1,
  HEALTH_HIPAA: 1,
  UNCLASSIFIED: 0.3,
};

const TRIGGER_WEIGHT: Record<TriggerSignal, number> = {
  REG_FINE: 1,
  NEW_CISO: 0.85,
  M_AND_A: 0.75,
  COMPLIANCE_JOB_POST: 0.65,
  BOARD_MANDATE_DOLLAR_RISK: 0.9,
};

const WEIGHTS = {
  beachhead: 0.35,
  pain: 0.3,
  trigger: 0.2,
  methodology: 0.15,
} as const;

export function isBeachheadSector(value: string): value is BeachheadSector {
  return (BEACHHEAD_SECTORS as readonly string[]).includes(value);
}

export function isTriggerSignal(value: string): value is TriggerSignal {
  return (TRIGGER_SIGNALS as readonly string[]).includes(value);
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

function scoreBeachhead(sector?: BeachheadSector | null): number {
  if (!sector) return 0;
  return BEACHHEAD_SCORE[sector] ?? 0;
}

function scorePain(markers?: PainMarkers): number {
  if (!markers) return 0;
  const flags = [
    markers.manualBoardReporting,
    markers.noDollarRiskQuant,
    markers.fragmentedGrc,
    markers.multiEntityGovernance,
  ].filter(Boolean);
  if (flags.length === 0) return 0;
  return flags.length / 4;
}

function parseTriggersFromString(raw?: string | null): TriggerSignal[] {
  if (!raw?.trim()) return [];
  return raw
    .split(/[,|]/)
    .map((part) => part.trim().toUpperCase())
    .filter(isTriggerSignal);
}

function scoreTriggers(explicit?: TriggerSignal[], detectedTrigger?: string | null): number {
  const merged = new Set<TriggerSignal>([
    ...(explicit ?? []),
    ...parseTriggersFromString(detectedTrigger),
  ]);
  if (merged.size === 0) return 0;
  let max = 0;
  for (const trigger of merged) {
    max = Math.max(max, TRIGGER_WEIGHT[trigger] ?? 0);
  }
  return max;
}

function scoreMethodology(markers?: MethodologyMarkers): number {
  if (!markers) return 0;
  const flags = [markers.commercialInsightDelivered, markers.spinSituationReduced].filter(Boolean);
  if (flags.length === 0) return 0;
  return flags.length / 2;
}

export function computeQualificationScores(input: QualificationInput): QualificationSignals {
  const beachheadScore = clamp01(scoreBeachhead(input.industrySector));
  const painScore = clamp01(scorePain(input.painMarkers));
  const triggerScore = clamp01(scoreTriggers(input.triggers, input.detectedTrigger));
  const methodologyScore = clamp01(scoreMethodology(input.methodology));

  const priorityWeight = clamp01(
    beachheadScore * WEIGHTS.beachhead +
      painScore * WEIGHTS.pain +
      triggerScore * WEIGHTS.trigger +
      methodologyScore * WEIGHTS.methodology,
  );

  return {
    beachheadScore,
    painScore,
    triggerScore,
    methodologyScore,
    priorityWeight,
    ...(input.painMarkers ? { painMarkers: input.painMarkers } : {}),
    triggers: [
      ...new Set([...(input.triggers ?? []), ...parseTriggersFromString(input.detectedTrigger)]),
    ],
    ...(input.methodology ? { methodology: input.methodology } : {}),
    computedAt: new Date().toISOString(),
  };
}

export function priorityScoreFromSignals(signals: QualificationSignals): number {
  return Math.round(clamp01(signals.priorityWeight) * 100);
}

export function classifyVulnerability(signals: QualificationSignals): "HIGH" | "MEDIUM" | "LOW" {
  const score = priorityScoreFromSignals(signals);
  if (score >= 70) return "HIGH";
  if (score >= 40) return "MEDIUM";
  return "LOW";
}
