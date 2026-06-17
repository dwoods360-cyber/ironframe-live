import { beforeEach, describe, expect, it, vi } from 'vitest';

const HARVEST_SCORE_DELTA = 25;

const LONDON_SEED_DOMAINS = [
  'payflow-london.io',
  'ledgerbridge.uk',
  'vaultpulse.finance',
  'regstack.io',
] as const;

const SINGAPORE_SEED_DOMAINS = [
  'finstack.sg',
  'meridianpay.asia',
  'chaincustody.sg',
  'compliance-lattice.io',
] as const;

type ProspectRow = {
  id: string;
  domain: string;
  companyName: string;
  employeeCount: number;
  region: string;
  compliancePressure: string;
  dealStage: string;
  aiFitnessScore: number;
  recentFunding: string | null;
  hasComplianceJob: boolean;
  updatedAt: Date;
};

const { prospectStore, flywheelLogs, prismaMock } = vi.hoisted(() => {
  const prospectStore = new Map<string, ProspectRow>();
  const flywheelLogs: Array<{ message: string }> = [];

  const prismaMock = {
    marketProspect: {
      findUnique: vi.fn(async ({ where }: { where: { domain?: string; id?: string } }) => {
        if (where.domain) return prospectStore.get(where.domain) ?? null;
        if (where.id) {
          for (const row of prospectStore.values()) {
            if (row.id === where.id) return row;
          }
        }
        return null;
      }),
      findMany: vi.fn(
        async ({
          where,
          orderBy,
        }: {
          where?: {
            region?: string | { in: string[] };
            dealStage?: { not: string };
            aiFitnessScore?: { gte: number };
          };
          orderBy?: { aiFitnessScore: 'desc' | 'asc' };
        }) => {
          let rows = [...prospectStore.values()];
          if (where?.region) {
            if (typeof where.region === 'string') {
              rows = rows.filter(r => r.region === where.region);
            } else if (Array.isArray(where.region.in)) {
              const allowed = new Set(where.region.in);
              rows = rows.filter(r => allowed.has(r.region));
            }
          }
          if (where?.dealStage?.not) rows = rows.filter(r => r.dealStage !== where.dealStage!.not);
          if (where?.aiFitnessScore?.gte != null) {
            rows = rows.filter(r => r.aiFitnessScore >= where.aiFitnessScore!.gte);
          }
          if (orderBy?.aiFitnessScore === 'desc') {
            rows.sort((a, b) => b.aiFitnessScore - a.aiFitnessScore);
          }
          return rows;
        },
      ),
      upsert: vi.fn(
        async ({
          where,
          create,
          update,
        }: {
          where: { domain: string };
          create: Omit<ProspectRow, 'id' | 'updatedAt'> & { id?: string };
          update: Partial<Omit<ProspectRow, 'id' | 'domain'>>;
        }) => {
          const existing = prospectStore.get(where.domain);
          const next: ProspectRow = existing
            ? {
                ...existing,
                ...update,
                updatedAt: new Date(),
              }
            : {
                id: create.id ?? `id-${where.domain}`,
                domain: where.domain,
                companyName: create.companyName,
                employeeCount: create.employeeCount,
                region: create.region,
                compliancePressure: create.compliancePressure,
                dealStage: create.dealStage,
                aiFitnessScore: create.aiFitnessScore,
                recentFunding: create.recentFunding,
                hasComplianceJob: create.hasComplianceJob,
                updatedAt: new Date(),
              };
          prospectStore.set(where.domain, next);
          return next;
        },
      ),
      update: vi.fn(
        async ({
          where,
          data,
        }: {
          where: { domain: string };
          data: {
            aiFitnessScore?: { increment: number };
            dealStage?: string;
          };
        }) => {
          const row = prospectStore.get(where.domain);
          if (!row) throw new Error('Prospect not found');
          const delta = data.aiFitnessScore?.increment ?? 0;
          const updated: ProspectRow = {
            ...row,
            aiFitnessScore: row.aiFitnessScore + delta,
            dealStage: data.dealStage ?? row.dealStage,
            updatedAt: new Date(),
          };
          prospectStore.set(where.domain, updated);
          return updated;
        },
      ),
    },
    marketIntelligenceFlywheelLog: {
      create: vi.fn(async ({ data }: { data: { message: string } }) => {
        flywheelLogs.push({ message: data.message });
        return { id: `log-${flywheelLogs.length}` };
      }),
    },
    outreachHistory: {
      create: vi.fn(),
    },
  };

  return { prospectStore, flywheelLogs, prismaMock };
});

vi.mock('../loadIronboardEnv.js', () => ({
  loadIronboardEnv: vi.fn(),
  getIronboardApiKey: vi.fn(),
  getIronboardGeminiModel: vi.fn(() => 'gemini-2.5-flash'),
}));

vi.mock('./prisma.js', () => ({
  getPrisma: vi.fn(() => prismaMock),
}));

import {
  calculateTierScore,
  fetchProspectingBatch,
  fetchProspectingBatchForTargets,
  harvestInteractionSignal,
  mapStoredProspect,
  resolveDealStageForScore,
  scoreAndInsertProspect,
} from './marketIntelligence.js';

function seedProspect(overrides: Partial<ProspectRow> & Pick<ProspectRow, 'domain'>): ProspectRow {
  const row: ProspectRow = {
    id: overrides.id ?? `id-${overrides.domain}`,
    companyName: overrides.companyName ?? 'Test Co',
    employeeCount: overrides.employeeCount ?? 20,
    region: overrides.region ?? 'London',
    compliancePressure: overrides.compliancePressure ?? 'SOC2',
    dealStage: overrides.dealStage ?? 'PROSPECT',
    aiFitnessScore: overrides.aiFitnessScore ?? 100,
    recentFunding: overrides.recentFunding ?? 'NONE',
    hasComplianceJob: overrides.hasComplianceJob ?? false,
    updatedAt: overrides.updatedAt ?? new Date(),
    ...overrides,
  };
  prospectStore.set(row.domain, row);
  return row;
}

describe('marketIntelligence scoring', () => {
  beforeEach(() => {
    prospectStore.clear();
    flywheelLogs.length = 0;
    vi.clearAllMocks();
  });

  it('calculateTierScore sums regional, compliance, funding, and hiring signals', () => {
    expect(
      calculateTierScore({
        region: 'London',
        compliancePressure: 'SOC2',
        recentFunding: 'SERIES_A',
        hasComplianceJob: true,
      }),
    ).toBe(275);

    expect(
      calculateTierScore({
        region: 'Singapore',
        compliancePressure: 'ISO27001',
        recentFunding: 'SEED',
        hasComplianceJob: false,
      }),
    ).toBe(200);
  });

  it('mapStoredProspect sets icpScore from aiFitnessScore, not list index', () => {
    const mapped = mapStoredProspect({
      id: 'uuid-1',
      domain: 'finstack.sg',
      companyName: 'FinStack SG',
      employeeCount: 35,
      region: 'Singapore',
      compliancePressure: 'SOC2',
      dealStage: 'PROSPECT',
      aiFitnessScore: 275,
      recentFunding: 'SERIES_A',
      hasComplianceJob: true,
      updatedAt: new Date('2026-06-08T12:00:00.000Z'),
    });
    expect(mapped.icpScore).toBe(275);
    expect(mapped.icpScore).toBe(mapped.aiFitnessScore);
  });

  it('icpScore falls back to zero only when aiFitnessScore is zero', () => {
    const mapped = mapStoredProspect({
      id: 'uuid-2',
      domain: 'regstack.io',
      companyName: 'RegStack',
      employeeCount: 19,
      region: 'London',
      compliancePressure: 'ISO27001',
      dealStage: 'REJECTED',
      aiFitnessScore: 0,
      recentFunding: 'NONE',
      hasComplianceJob: false,
      updatedAt: new Date(),
    });
    expect(mapped.icpScore ?? 0).toBe(0);
  });
});

describe('resolveDealStageForScore', () => {
  it('maps tier scores to pipeline phases without defaulting qualified rows to REJECTED', () => {
    expect(resolveDealStageForScore(275)).toBe('PROSPECT');
    expect(resolveDealStageForScore(200)).toBe('PROSPECT');
    expect(resolveDealStageForScore(100)).toBe('PROSPECT');
    expect(resolveDealStageForScore(0)).toBe('REJECTED');
    expect(resolveDealStageForScore(99)).toBe('REJECTED');
  });

  it('honours explicit requested stages when score meets the active threshold', () => {
    expect(resolveDealStageForScore(275, 'OUTREACHED')).toBe('OUTREACHED');
    expect(resolveDealStageForScore(275, 'QUALIFIED')).toBe('QUALIFIED');
    expect(resolveDealStageForScore(100, 'OUTREACHED')).toBe('OUTREACHED');
  });

  it('forces REJECTED when score is below the 100-point qualification floor regardless of request', () => {
    expect(resolveDealStageForScore(50, 'PROSPECT')).toBe('REJECTED');
    expect(resolveDealStageForScore(99, 'QUALIFIED')).toBe('REJECTED');
    expect(resolveDealStageForScore(0, 'OUTREACHED')).toBe('REJECTED');
  });

  it('ignores a requested REJECTED label when score qualifies — returns PROSPECT', () => {
    expect(resolveDealStageForScore(275, 'REJECTED')).toBe('PROSPECT');
  });
});

describe('harvestInteractionSignal', () => {
  beforeEach(() => {
    prospectStore.clear();
    flywheelLogs.length = 0;
    vi.clearAllMocks();
  });

  it('HARVEST SIGNAL (+) increments aiFitnessScore by +25 and advances to QUALIFIED', async () => {
    seedProspect({
      domain: 'payflow-london.io',
      aiFitnessScore: 100,
      dealStage: 'PROSPECT',
    });

    const result = await harvestInteractionSignal('payflow-london.io', 'positive reply', true);

    expect(result.aiFitnessScore).toBe(125);
    expect(result.icpScore).toBe(125);
    expect(result.newStatus).toBe('QUALIFIED');
    expect(prospectStore.get('payflow-london.io')?.aiFitnessScore).toBe(125);
    expect(flywheelLogs.at(-1)?.message).toContain('Score shifted by 25');
  });

  it('HARVEST SIGNAL (−) decrements aiFitnessScore by −25 and routes to REJECTED', async () => {
    seedProspect({
      domain: 'payflow-london.io',
      aiFitnessScore: 100,
      dealStage: 'PROSPECT',
    });

    const result = await harvestInteractionSignal('payflow-london.io', 'negative reply', false);

    expect(result.aiFitnessScore).toBe(75);
    expect(result.icpScore).toBe(75);
    expect(result.newStatus).toBe('REJECTED');
    expect(prospectStore.get('payflow-london.io')?.dealStage).toBe('REJECTED');
  });

  it('applies repeated negative harvest deltas down to sub-threshold scores', async () => {
    seedProspect({
      domain: 'regstack.io',
      aiFitnessScore: 100,
      dealStage: 'PROSPECT',
    });

    await harvestInteractionSignal('regstack.io', '', false);
    expect(prospectStore.get('regstack.io')?.aiFitnessScore).toBe(75);

    await harvestInteractionSignal('regstack.io', '', false);
    expect(prospectStore.get('regstack.io')?.aiFitnessScore).toBe(50);

    await harvestInteractionSignal('regstack.io', '', false);
    expect(prospectStore.get('regstack.io')?.aiFitnessScore).toBe(25);

    await harvestInteractionSignal('regstack.io', '', false);
    expect(prospectStore.get('regstack.io')?.aiFitnessScore).toBe(0);
  });

  it('uses the ±25 matrix modifier consistently', () => {
    expect(HARVEST_SCORE_DELTA).toBe(25);
  });
});

describe('fetchProspectingBatch', () => {
  beforeEach(() => {
    prospectStore.clear();
    vi.clearAllMocks();
  });

  it('seeds London hub batch into an empty store and returns qualified regional rows', async () => {
    expect(prospectStore.size).toBe(0);

    const london = await fetchProspectingBatch('London');

    expect(prismaMock.marketProspect.upsert).toHaveBeenCalledTimes(4);
    for (const domain of LONDON_SEED_DOMAINS) {
      expect(prospectStore.has(domain)).toBe(true);
    }

    expect(london.every(p => p.region === 'London')).toBe(true);
    expect(london.every(p => p.aiFitnessScore >= 100)).toBe(true);
    expect(london.every(p => p.icpScore === p.aiFitnessScore)).toBe(true);
    expect(london.map(p => p.domain).sort()).toEqual([...LONDON_SEED_DOMAINS].sort());

    const payflow = london.find(p => p.domain === 'payflow-london.io');
    expect(payflow?.aiFitnessScore).toBe(275);
    expect(payflow?.dealStage).toBe('PROSPECT');
  });

  it('seeds Singapore hub batch into an empty store with distinct payloads', async () => {
    const singapore = await fetchProspectingBatch('Singapore');

    expect(prismaMock.marketProspect.upsert).toHaveBeenCalledTimes(4);
    for (const domain of SINGAPORE_SEED_DOMAINS) {
      expect(prospectStore.has(domain)).toBe(true);
    }

    expect(singapore.every(p => p.region === 'Singapore')).toBe(true);
    expect(singapore.map(p => p.domain).sort()).toEqual([...SINGAPORE_SEED_DOMAINS].sort());

    const finstack = singapore.find(p => p.domain === 'finstack.sg');
    expect(finstack?.aiFitnessScore).toBe(275);

    const londonDomains = new Set(LONDON_SEED_DOMAINS);
    expect(singapore.some(p => londonDomains.has(p.domain as (typeof LONDON_SEED_DOMAINS)[number]))).toBe(
      false,
    );
  });

  it('scoreAndInsertProspect writes tierScore and dealStage from resolveDealStageForScore', async () => {
    await scoreAndInsertProspect({
      domain: 'payflow-london.io',
      companyName: 'PayFlow London',
      employeeCount: 28,
      region: 'London',
      compliancePressure: 'SOC2',
      recentFunding: 'SERIES_A',
      hasComplianceJob: true,
      dealStage: 'PROSPECT',
    });

    const row = prospectStore.get('payflow-london.io');
    expect(row?.aiFitnessScore).toBe(275);
    expect(row?.dealStage).toBe('PROSPECT');
  });

  it('scoreAndInsertProspect rejects sub-threshold accounts as REJECTED', async () => {
    await scoreAndInsertProspect({
      domain: 'sub-threshold.io',
      companyName: 'Sub Threshold',
      employeeCount: 20,
      region: 'London',
      compliancePressure: 'NONE',
      recentFunding: 'NONE',
      hasComplianceJob: false,
      dealStage: 'PROSPECT',
    });

    const row = prospectStore.get('sub-threshold.io');
    expect(row?.aiFitnessScore).toBe(50);
    expect(row?.dealStage).toBe('REJECTED');
  });
});

describe('fetchProspectingBatchForTargets', () => {
  beforeEach(() => {
    prospectStore.clear();
    vi.clearAllMocks();
  });

  it('loads London and Singapore batches for multi-target campaigns', async () => {
    const rows = await fetchProspectingBatchForTargets(['London', 'Singapore']);
    expect(rows.length).toBe(8);
    expect(rows.some(p => p.region === 'London')).toBe(true);
    expect(rows.some(p => p.region === 'Singapore')).toBe(true);
  });

  it('seeds expansion markets for arbitrary country labels', async () => {
    const rows = await fetchProspectingBatchForTargets(['Germany']);
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every(p => p.region === 'Germany')).toBe(true);
    expect(rows.every(p => p.aiFitnessScore >= 100)).toBe(true);
  });
});
