import { describe, expect, it } from 'vitest';

import {
  PILOT_QUALITY_GATES,
  buildInitialPilotMetadata,
  classifyLeadRing,
  computeEvidenceCompletenessPct,
  inferFirstActionType,
  isGrcAuditableFirstAction,
  isIcpQualifiedProxy,
  isOutcomeStage,
  resolveQualificationLevel,
} from '@/Ironboard/src/services/crm/crmPilotTracking';

describe('crmPilotTracking', () => {
  it('classifies core beachhead vs Ring-2 adjacent', () => {
    expect(classifyLeadRing({ industrySector: 'REGIONAL_BHC' })).toBe('CORE_BEACHHEAD');
    expect(
      classifyLeadRing({ industrySector: 'UNCLASSIFIED', adjacentSector: 'CREDIT_UNION' }),
    ).toBe('RING_2');
    expect(classifyLeadRing({ industrySector: 'UNCLASSIFIED' })).toBe('UNCLASSIFIED');
  });

  it('scores evidence completeness across GRC-relevant fields', () => {
    const sparse = computeEvidenceCompletenessPct({
      industrySector: 'UNCLASSIFIED',
      adjacentSector: 'HIGHER_ED',
    });
    const rich = computeEvidenceCompletenessPct({
      industrySector: 'UNCLASSIFIED',
      adjacentSector: 'HIGHER_ED',
      detectedTrigger: 'NEW_CISO',
      qualificationSignals: {
        beachheadScore: 0.55,
        painScore: 0.5,
        triggerScore: 0.85,
        methodologyScore: 0.5,
        priorityWeight: 0.55,
        painMarkers: { fragmentedGrc: true },
        methodology: { commercialInsightDelivered: true },
        computedAt: new Date().toISOString(),
      },
      hasGrcFirstAction: true,
    });
    expect(sparse).toBe(20);
    expect(rich).toBe(100);
  });

  it('resolves Q-proxy vs Q-confirmed qualification levels', () => {
    expect(
      resolveQualificationLevel({
        priorityScore: 45,
        industrySector: 'UNCLASSIFIED',
        adjacentSector: 'CREDIT_UNION',
      }),
    ).toBe('PROXY');
    expect(
      resolveQualificationLevel({
        priorityScore: 45,
        industrySector: 'UNCLASSIFIED',
        adjacentSector: 'CREDIT_UNION',
        detectedTrigger: 'NEW_CISO',
        qualificationSignals: {
          beachheadScore: 0.55,
          painScore: 0.25,
          triggerScore: 0.85,
          methodologyScore: 0,
          priorityWeight: 0.45,
          painMarkers: { fragmentedGrc: true },
          triggers: ['NEW_CISO'],
          computedAt: new Date().toISOString(),
        },
        icpConfirmed: true,
      }),
    ).toBe('CONFIRMED');
  });

  it('uses priority score proxy for ICP qualification', () => {
    expect(isIcpQualifiedProxy(39)).toBe(false);
    expect(isIcpQualifiedProxy(40)).toBe(true);
  });

  it('treats QUALIFIED+ deal stages as outcome milestones', () => {
    expect(isOutcomeStage('PROSPECT')).toBe(false);
    expect(isOutcomeStage('QUALIFIED')).toBe(true);
    expect(isOutcomeStage('DISCOVERY')).toBe(true);
  });

  it('seeds pilot metadata on contact create', () => {
    const metadata = buildInitialPilotMetadata({
      ingestionSource: 'PARTNER_REFERRAL',
      industrySector: 'UNCLASSIFIED',
      adjacentSector: 'REGIONAL_INSURANCE',
    });
    expect(metadata.pilot).toMatchObject({
      ring: 'RING_2',
      ingestionSource: 'PARTNER_REFERRAL',
      cohort: 'ring2-pilot-2026-07',
      qualificationLevel: 'NONE',
    });
  });

  it('requires auditable GRC first-action types for FA tracking', () => {
    expect(isGrcAuditableFirstAction(inferFirstActionType('vendor risk assessment opened'))).toBe(
      true,
    );
    expect(isGrcAuditableFirstAction('OTHER')).toBe(false);
  });

  it('exposes full Gate B threshold constants', () => {
    expect(PILOT_QUALITY_GATES.minQualificationRatePct).toBe(30);
    expect(PILOT_QUALITY_GATES.minEvidenceCompletenessPct).toBe(60);
    expect(PILOT_QUALITY_GATES.minFirstActionRateOfQualifiedPct).toBe(40);
    expect(PILOT_QUALITY_GATES.maxMedianFirstActionBusinessHours).toBe(40);
    expect(PILOT_QUALITY_GATES.consecutiveWeeksRequired).toBe(2);
  });
});
