import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  frameworkMatchesProspect,
  inferFrameworksFromRegulation,
  regionMatchesAuthority,
} from '@/app/services/ironboard/industryScoutProspectBridge';
import type { IngestedRegulationRecord } from '@/app/types/regulatoryIngestion';

function sampleReg(overrides: Partial<IngestedRegulationRecord> = {}): IngestedRegulationRecord {
  return {
    id: 'reg-abc',
    ingestedAt: new Date().toISOString(),
    source: 'ironsight_crawler',
    authority: 'SEC',
    title: 'Safeguards Rule breach notification amendment',
    sourceUrl: 'https://sec.gov/example',
    localPath: null,
    sha256: 'abc123',
    mimeType: 'text/plain',
    ironscribeOperator: 'IRONSCRIBE_AGENT_5',
    blocks: [
      {
        blockId: 'b1',
        sectionRef: 's1',
        title: 'SOC 2 incident reporting',
        body: 'Covered entities must align SOC 2 trust services criteria with breach notification.',
        effectiveDate: '2026-07-01',
        authority: 'SEC',
        assetImpact: 'HIGH',
      },
    ],
    ...overrides,
  };
}

describe('industryScoutProspectBridge matchers', () => {
  it('infers SOC2 from safeguards and SOC2 language', () => {
    const frameworks = inferFrameworksFromRegulation(sampleReg());
    expect(frameworks).toContain('SOC2');
  });

  it('infers ISO27001 from ISMS language', () => {
    const frameworks = inferFrameworksFromRegulation(
      sampleReg({
        blocks: [
          {
            blockId: 'b1',
            sectionRef: 's1',
            title: 'ISO 27001 control uplift',
            body: 'Information security management system annual review required.',
            effectiveDate: null,
            authority: 'NIST',
            assetImpact: 'MEDIUM',
          },
        ],
      }),
    );
    expect(frameworks).toContain('ISO27001');
  });

  it('matches SEC regulations to United States prospects', () => {
    expect(regionMatchesAuthority('United States', 'SEC')).toBe(true);
    expect(regionMatchesAuthority('Germany', 'SEC')).toBe(false);
  });

  it('matches NIST to global expansion hubs including London', () => {
    expect(regionMatchesAuthority('London', 'NIST')).toBe(true);
    expect(regionMatchesAuthority('Singapore', 'NIST')).toBe(true);
  });

  it('pairs prospect compliance pressure with framework', () => {
    expect(frameworkMatchesProspect('SOC2', 'SOC2')).toBe(true);
    expect(frameworkMatchesProspect('SOC2', 'ISO27001')).toBe(false);
    expect(frameworkMatchesProspect('ISO27001', 'ISO27001')).toBe(true);
  });
});
