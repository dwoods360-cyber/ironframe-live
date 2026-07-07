import { describe, expect, it } from 'vitest';

import {
  classifyVulnerability,
  computeQualificationScores,
  priorityScoreFromSignals,
} from '@/Ironboard/src/services/crm/leadPrioritization';

describe('crmLeadPrioritization', () => {
  it('scores a fully qualified regional BHC with regulatory trigger as HIGH', () => {
    const signals = computeQualificationScores({
      industrySector: 'REGIONAL_BHC',
      detectedTrigger: 'REG_FINE,NEW_CISO',
      painMarkers: {
        manualBoardReporting: true,
        noDollarRiskQuant: true,
        fragmentedGrc: true,
        multiEntityGovernance: true,
      },
      methodology: {
        commercialInsightDelivered: true,
        spinSituationReduced: true,
      },
    });

    const score = priorityScoreFromSignals(signals);
    expect(score).toBeGreaterThanOrEqual(85);
    expect(classifyVulnerability(signals)).toBe('HIGH');
    expect(signals.triggerScore).toBe(1);
  });

  it('applies board weighting formula components', () => {
    const signals = computeQualificationScores({
      industrySector: 'UTILITY_NERC',
      painMarkers: { fragmentedGrc: true, noDollarRiskQuant: true },
      triggers: ['COMPLIANCE_JOB_POST'],
      methodology: { commercialInsightDelivered: true },
    });

    const expected =
      signals.beachheadScore * 0.35 +
      signals.painScore * 0.3 +
      signals.triggerScore * 0.2 +
      signals.methodologyScore * 0.15;

    expect(signals.priorityWeight).toBeCloseTo(expected, 5);
    expect(priorityScoreFromSignals(signals)).toBe(Math.round(expected * 100));
  });

  it('returns LOW for unclassified sector without pain or triggers', () => {
    const signals = computeQualificationScores({
      industrySector: 'UNCLASSIFIED',
    });
    expect(priorityScoreFromSignals(signals)).toBeLessThan(40);
    expect(classifyVulnerability(signals)).toBe('LOW');
  });

  it('parses comma-separated detectedTrigger strings', () => {
    const signals = computeQualificationScores({
      industrySector: 'MSSP_ENCLAVE',
      detectedTrigger: 'NEW_CISO,M_AND_A',
    });
    expect(signals.triggers).toEqual(expect.arrayContaining(['NEW_CISO', 'M_AND_A']));
    expect(signals.triggerScore).toBe(0.85);
  });
});
