import { beforeEach, describe, expect, it, vi } from 'vitest';

const prospectStore = new Map<string, unknown>();

vi.mock('../../Ironboard/src/services/prisma.js', () => ({
  getPrisma: () => ({
    marketProspect: {
      findMany: async ({ where }: { where?: { region?: string } }) => {
        const rows = [...prospectStore.values()] as Array<{ region: string; id: string }>;
        if (where?.region) return rows.filter(row => row.region === where.region);
        return rows;
      },
      deleteMany: async ({ where }: { where: { id: { in: string[] } } }) => {
        for (const id of where.id.in) {
          for (const [key, row] of prospectStore.entries()) {
            if ((row as { id: string }).id === id) prospectStore.delete(key);
          }
        }
        return { count: where.id.in.length };
      },
    },
    marketIntelligenceFlywheelLog: {
      create: async () => ({}),
    },
  }),
}));

import {
  discoverRegionalProspects,
  type RegionalDiscoveryDeps,
} from '../../Ironboard/src/services/discoverRegionalProspects.js';

describe('discoverRegionalProspects', () => {
  const prospectStore = new Map<string, unknown>();
  const mockGenerateContent = vi.fn();

  const deps: RegionalDiscoveryDeps = {
    listProspects: vi.fn(async (_regions: string[], activeOnly: boolean) => {
      const rows = [...prospectStore.values()] as Array<{ region: string; dealStage: string }>;
      return rows.filter((r) => !activeOnly || r.dealStage !== 'REJECTED') as never[];
    }),
    scoreAndInsert: vi.fn(async (account: { domain: string; region: string }) => {
      const row = {
        id: `id-${account.domain}`,
        domain: account.domain,
        companyName: account.domain,
        employeeCount: 20,
        region: account.region,
        compliancePressure: 'SOC2',
        dealStage: 'PROSPECT',
        aiFitnessScore: 200,
        icpScore: 200,
        recentFunding: 'SEED',
        hasComplianceJob: true,
        updatedAt: new Date(),
      };
      prospectStore.set(account.domain, row);
      return {
        status: 'SUCCESS' as const,
        id: row.id,
        score: 200,
        dealStage: 'PROSPECT',
        excludedFromActive: false,
      };
    }),
    findProspect: vi.fn(async (id: string) => {
      for (const row of prospectStore.values()) {
        if ((row as { id: string }).id === id) return row as never;
      }
      return null;
    }),
    getApiKey: () => 'test-key',
    getModel: () => 'gemini-3.5-flash',
    isSemiAutonomous: () => false,
    generateContent: mockGenerateContent,
  };

  beforeEach(() => {
    prospectStore.clear();
    mockGenerateContent.mockReset();
    vi.mocked(deps.listProspects!).mockClear();
    vi.mocked(deps.scoreAndInsert!).mockClear();
  });

  it('skips when region already has three or more authentic prospect rows', async () => {
    prospectStore.set('a.io', {
      region: 'Germany',
      dealStage: 'PROSPECT',
      companyName: 'Acme Pay',
      domain: 'a.io',
      employeeCount: 20,
    });
    prospectStore.set('b.io', {
      region: 'Germany',
      dealStage: 'PROSPECT',
      companyName: 'Beta Fin',
      domain: 'b.io',
      employeeCount: 22,
    });
    prospectStore.set('c.io', {
      region: 'Germany',
      dealStage: 'PROSPECT',
      companyName: 'Gamma Reg',
      domain: 'c.io',
      employeeCount: 18,
    });

    const result = await discoverRegionalProspects('Germany', deps, { operatorTriggered: true });
    expect(result.skipped).toBe(true);
    expect(result.source).toBe('skipped_threshold');
    expect(mockGenerateContent).not.toHaveBeenCalled();
  });

  it('purges synthetic expansion placeholders and runs live discovery', async () => {
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify({
        prospects: [
          {
            companyName: 'Berlin Pay GmbH',
            domain: 'berlinpay.de',
            employeeCount: 22,
            compliancePressure: 'SOC2',
          },
        ],
      }),
    });

    prospectStore.set('germany-ledger.io', {
      id: 'id-germany-ledger.io',
      domain: 'germany-ledger.io',
      companyName: 'Germany Ledger',
      employeeCount: 24,
      region: 'Germany',
      compliancePressure: 'SOC2',
      dealStage: 'PROSPECT',
      aiFitnessScore: 200,
      icpScore: 200,
      recentFunding: 'SEED',
      hasComplianceJob: true,
      updatedAt: new Date(),
    });
    prospectStore.set('germany-vault.finance', {
      id: 'id-germany-vault.finance',
      domain: 'germany-vault.finance',
      companyName: 'Germany Vault',
      employeeCount: 18,
      region: 'Germany',
      compliancePressure: 'ISO27001',
      dealStage: 'PROSPECT',
      aiFitnessScore: 100,
      icpScore: 100,
      recentFunding: 'NONE',
      hasComplianceJob: false,
      updatedAt: new Date(),
    });
    prospectStore.set('extra.io', {
      id: 'id-extra.io',
      domain: 'extra.io',
      companyName: 'Extra GmbH',
      employeeCount: 20,
      region: 'Germany',
      dealStage: 'PROSPECT',
    });

    const result = await discoverRegionalProspects('Germany', deps, { operatorTriggered: true });
    expect(result.skipped).toBe(false);
    expect(mockGenerateContent).toHaveBeenCalled();
  });

  it('blocks background discovery when semi-autonomous mode is disabled', async () => {
    const result = await discoverRegionalProspects('Germany', deps);
    expect(result.skipped).toBe(true);
    expect(result.source).toBe('skipped_semi_autonomous');
    expect(mockGenerateContent).not.toHaveBeenCalled();
  });

  it('ingests web-grounded candidates into scoreAndInsertProspect', async () => {
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify({
        prospects: [
          {
            companyName: 'Berlin Pay GmbH',
            domain: 'berlinpay.de',
            websiteUrl: 'https://berlinpay.de',
            employeeCount: 22,
            compliancePressure: 'SOC2',
            recentFunding: 'SEED',
            hasComplianceJob: true,
            securityStanceSummary: 'Public SOC 2 Type I page and security.txt present.',
          },
        ],
      }),
      candidates: [{ groundingMetadata: { webSearchQueries: ['fintech SOC2 Germany'] } }],
    });

    const result = await discoverRegionalProspects('Germany', deps, { operatorTriggered: true });
    expect(result.skipped).toBe(false);
    expect(result.source).toBe('web_grounding');
    expect(result.ingested).toHaveLength(1);
    expect(result.ingested[0]?.domain).toBe('berlinpay.de');
    expect(result.groundingQueries).toEqual(['fintech SOC2 Germany']);
    expect(deps.scoreAndInsert).toHaveBeenCalledWith(
      expect.objectContaining({ domain: 'berlinpay.de', region: 'Germany' }),
    );
  });

  it('normalizes alias field names from live web search responses', async () => {
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify({
        prospects: [
          {
            legalCompanyName: 'Wintrust Financial Corporation',
            primaryWebsiteDomain: 'wintrust.com',
            fullWebsiteURL: 'https://www.wintrust.com/',
            estimatedEmployeeCount: 5747,
            compliancePressure: 'SOC2',
            recentFunding: 'NONE',
            hasComplianceJob: true,
            securityStanceSummary: 'Public security and compliance hiring.',
          },
        ],
      }),
    });

    const result = await discoverRegionalProspects('United States', deps, { operatorTriggered: true });
    expect(result.skipped).toBe(false);
    expect(result.ingested).toHaveLength(1);
    expect(result.ingested[0]?.domain).toBe('wintrust.com');
  });
});
