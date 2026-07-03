import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  assessRegionProspectAuthenticity,
  isSyntheticExpansionTemplateProspect,
  purgeSyntheticExpansionProspectsForRegion,
} from '../../Ironboard/src/services/marketProspectAuthenticity.js';

const prismaMock = {
  marketProspect: {
    findMany: vi.fn(),
    deleteMany: vi.fn(),
  },
  marketIntelligenceFlywheelLog: {
    create: vi.fn(async () => ({})),
  },
};

vi.mock('../../Ironboard/src/services/prisma.js', () => ({
  getPrisma: () => prismaMock,
}));

vi.mock('../../Ironboard/src/services/discoverRegionalProspects.js', () => ({
  discoverRegionalProspects: vi.fn(async () => ({
    region: 'Germany',
    skipped: false,
    source: 'web_grounding',
    ingested: [],
    candidatesParsed: 1,
  })),
}));

describe('marketProspectAuthenticity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('flags expansion template Ledger and Vault signatures', () => {
    expect(
      isSyntheticExpansionTemplateProspect({
        companyName: 'Germany Ledger',
        domain: 'germany-ledger.io',
        employeeCount: 24,
        region: 'Germany',
      }),
    ).toBe(true);
    expect(
      isSyntheticExpansionTemplateProspect({
        companyName: 'Germany Vault',
        domain: 'germany-vault.finance',
        employeeCount: 18,
        region: 'Germany',
      }),
    ).toBe(true);
    expect(
      isSyntheticExpansionTemplateProspect({
        companyName: 'PayFlow London',
        domain: 'payflow-london.io',
        employeeCount: 28,
        region: 'London',
      }),
    ).toBe(false);
  });

  it('assessRegionProspectAuthenticity marks polluted regions below authentic threshold', () => {
    const assessment = assessRegionProspectAuthenticity('Germany', [
      {
        companyName: 'Germany Ledger',
        domain: 'germany-ledger.io',
        employeeCount: 24,
        region: 'Germany',
      },
      {
        companyName: 'Germany Vault',
        domain: 'germany-vault.finance',
        employeeCount: 18,
        region: 'Germany',
      },
    ]);
    expect(assessment.polluted).toBe(true);
    expect(assessment.authenticCount).toBe(0);
    expect(assessment.meetsAuthenticThreshold).toBe(false);
  });

  it('purgeSyntheticExpansionProspectsForRegion deletes template rows only', async () => {
    prismaMock.marketProspect.findMany.mockResolvedValueOnce([
      {
        id: 'a',
        companyName: 'Germany Ledger',
        domain: 'germany-ledger.io',
        employeeCount: 24,
        region: 'Germany',
      },
      {
        id: 'b',
        companyName: 'N26',
        domain: 'n26.com',
        employeeCount: 30,
        region: 'Germany',
      },
    ]);
    prismaMock.marketProspect.deleteMany.mockResolvedValueOnce({ count: 1 });

    const purged = await purgeSyntheticExpansionProspectsForRegion('Germany');
    expect(purged).toBe(1);
    expect(prismaMock.marketProspect.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ['a'] } },
    });
  });
});
