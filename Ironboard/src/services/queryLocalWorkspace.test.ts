import { beforeEach, describe, expect, it, vi } from 'vitest';

const listProspectsMock = vi.fn();

vi.mock('./marketIntelligence.js', () => ({
  listProspects: (...args: unknown[]) => listProspectsMock(...args),
  listProspectsInRegions: (...args: unknown[]) => listProspectsMock(...args),
}));

vi.mock('./prisma.js', () => ({
  getPrisma: vi.fn(() => ({
    outreachHistory: { findMany: vi.fn().mockResolvedValue([]) },
    marketIntelligenceFlywheelLog: { findMany: vi.fn().mockResolvedValue([]) },
  })),
}));

import { executeQueryLocalWorkspace, QUERY_LOCAL_WORKSPACE_DECLARATION, stringifyWorkspaceBigIntFields } from './queryLocalWorkspace.js';

describe('queryLocalWorkspace', () => {
  beforeEach(() => {
    listProspectsMock.mockReset();
  });

  it('declares open region parameters without geographic enums', () => {
    const props = QUERY_LOCAL_WORKSPACE_DECLARATION.parameters.properties;
    expect(props.queryType.enum).toBeUndefined();
    expect(props.region.enum).toBeUndefined();
    expect(props.regions.enum).toBeUndefined();
    expect((props.regions as { items?: { enum?: unknown } }).items?.enum).toBeUndefined();
  });

  it('returns icpScore alias tied to aiFitnessScore for active_prospects', async () => {
    listProspectsMock.mockResolvedValue([
      {
        id: 'p-1',
        domain: 'payflow-london.io',
        companyName: 'PayFlow London',
        employeeCount: 28,
        region: 'London',
        compliancePressure: 'SOC2',
        dealStage: 'PROSPECT',
        aiFitnessScore: 275,
        icpScore: 275,
        recentFunding: 'SERIES_A',
        hasComplianceJob: true,
      },
    ]);

    const result = await executeQueryLocalWorkspace({
      queryType: 'active_prospects',
      region: 'London',
      limit: 5,
    });

    expect(result.ok).toBe(true);
    expect(result.success).toBe(true);
    expect(result.dataState).toBe('POPULATED');
    expect(result.prospects).toHaveLength(1);
    const row = (result.prospects as Array<{ icpScore: number; aiFitnessScore: number }>)[0];
    expect(row.icpScore).toBe(275);
    expect(row.aiFitnessScore).toBe(275);
    expect(row.icpScore).toBe(row.aiFitnessScore);
  });

  it('rejects unknown queryType', async () => {
    const result = await executeQueryLocalWorkspace({ queryType: 'invalid_type' });
    expect(result.ok).toBe(false);
  });

  it('loads active_prospects across multiple regions', async () => {
    listProspectsMock.mockResolvedValue([]);
    const result = await executeQueryLocalWorkspace({
      queryType: 'active_prospects',
      regions: ['Germany', 'Australia'],
      limit: 5,
    });
    expect(listProspectsMock).toHaveBeenCalledWith(['Germany', 'Australia'], true);
    expect(result.success).toBe(true);
    expect(result.dataState).toBe('PROVISIONED_EMPTY');
    expect(result.prospects).toEqual([]);
    expect(result.regions).toEqual(['Germany', 'Australia']);
  });

  it('returns PROVISIONED_EMPTY for unseeded global markets without throwing', async () => {
    listProspectsMock.mockResolvedValue([]);
    const result = await executeQueryLocalWorkspace({
      queryType: 'active_prospects',
      region: 'U.S.',
      limit: 10,
    });
    expect(result.ok).toBe(true);
    expect(result.success).toBe(true);
    expect(result.region).toBe('U.S.');
    expect(result.dataState).toBe('PROVISIONED_EMPTY');
    expect(result.prospects).toEqual([]);
  });

  it('stringifies bigint cent fields in workspace payloads', async () => {
    const formatted = stringifyWorkspaceBigIntFields({
      exposureCents: 250000000n,
      nested: { dealValueCents: 499900n },
    }) as Record<string, unknown>;
    expect(formatted.exposureCents).toBe('250000000');
    expect((formatted.nested as Record<string, unknown>).dealValueCents).toBe('499900');
  });
});
