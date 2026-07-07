/**
 * Deterministic IronBoard lead priority scoring.
 * P = (S_beachhead × 0.35) + (M_pain × 0.30) + (T_trigger × 0.20) + (C_methodology × 0.15)
 * All factors are 0.0–1.0; priorityScore is 0–100 integer.
 */

import type {
  AdjacentSector,
  BeachheadSector,
  MethodologyMarkers,
  PainMarkers,
  QualificationSignals,
  TriggerSignal,
} from '../../types/crm.js';
import {
  ADJACENT_SECTORS,
  BEACHHEAD_SECTORS,
  isAdjacentSector,
  isBeachheadSector,
  isCoreBeachheadSector,
  isTriggerSignal,
} from '../../types/crm.js';

export type {
  AdjacentSector,
  BeachheadSector,
  MethodologyMarkers,
  PainMarkers,
  QualificationSignals,
  TriggerSignal,
};
export {
  ADJACENT_SECTORS,
  BEACHHEAD_SECTORS,
  isAdjacentSector,
  isBeachheadSector,
  isCoreBeachheadSector,
  isTriggerSignal,
};

export type QualificationInput = {
  industrySector?: BeachheadSector | null;
  adjacentSector?: AdjacentSector | null;
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

/** Ring-2 adjacent sectors — partial market-fit when not a core beachhead. */
const ADJACENT_SECTOR_SCORE = 0.55;

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

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

function scoreMarketFit(
  industrySector?: BeachheadSector | null,
  adjacentSector?: AdjacentSector | null,
): number {
  if (industrySector && isCoreBeachheadSector(industrySector)) {
    return BEACHHEAD_SCORE[industrySector];
  }
  if (adjacentSector && isAdjacentSector(adjacentSector)) {
    return ADJACENT_SECTOR_SCORE;
  }
  if (industrySector === 'UNCLASSIFIED') {
    return BEACHHEAD_SCORE.UNCLASSIFIED;
  }
  return 0;
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
  const merged = new Set<TriggerSignal>([...(explicit ?? []), ...parseTriggersFromString(detectedTrigger)]);
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
  const beachheadScore = clamp01(scoreMarketFit(input.industrySector, input.adjacentSector));
  const painScore = clamp01(scorePain(input.painMarkers));
  const triggerScore = clamp01(scoreTriggers(input.triggers, input.detectedTrigger));
  const methodologyScore = clamp01(scoreMethodology(input.methodology));

  const priorityWeight = clamp01(
    beachheadScore * WEIGHTS.beachhead +
      painScore * WEIGHTS.pain +
      triggerScore * WEIGHTS.trigger +
      methodologyScore * WEIGHTS.methodology,
  );

  const resolvedAdjacent =
    input.adjacentSector && isAdjacentSector(input.adjacentSector) ? input.adjacentSector : null;

  return {
    beachheadScore,
    painScore,
    triggerScore,
    methodologyScore,
    priorityWeight,
    ...(resolvedAdjacent ? { adjacentSector: resolvedAdjacent } : {}),
    ...(input.painMarkers ? { painMarkers: input.painMarkers } : {}),
    triggers: [...new Set([...(input.triggers ?? []), ...parseTriggersFromString(input.detectedTrigger)])],
    ...(input.methodology ? { methodology: input.methodology } : {}),
    computedAt: new Date().toISOString(),
  };
}

export function priorityScoreFromSignals(signals: QualificationSignals): number {
  return Math.round(clamp01(signals.priorityWeight) * 100);
}

export function classifyVulnerability(signals: QualificationSignals): 'HIGH' | 'MEDIUM' | 'LOW' {
  const score = priorityScoreFromSignals(signals);
  if (score >= 70) return 'HIGH';
  if (score >= 40) return 'MEDIUM';
  return 'LOW';
}

export function parseQualificationInputFromRecord(row: {
  industrySector?: string | null;
  adjacentSector?: string | null;
  detectedTrigger?: string | null;
  qualificationSignals?: unknown;
}): QualificationInput {
  const signals =
    row.qualificationSignals && typeof row.qualificationSignals === 'object'
      ? (row.qualificationSignals as QualificationSignals)
      : null;

  const adjacentFromRow =
    row.adjacentSector && isAdjacentSector(row.adjacentSector) ? row.adjacentSector : null;
  const adjacentFromSignals =
    signals?.adjacentSector && isAdjacentSector(signals.adjacentSector)
      ? signals.adjacentSector
      : null;

  return {
    industrySector:
      row.industrySector && isBeachheadSector(row.industrySector) ? row.industrySector : null,
    adjacentSector: adjacentFromRow ?? adjacentFromSignals,
    detectedTrigger: row.detectedTrigger ?? null,
    painMarkers: signals?.painMarkers,
    triggers: signals?.triggers,
    methodology: signals?.methodology,
  };
}
