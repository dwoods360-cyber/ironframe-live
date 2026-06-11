import { beforeEach, describe, expect, it, vi } from 'vitest';

const listProspectsMock = vi.fn();

vi.mock('./marketIntelligence.js', () => ({
  listProspects: (...args: unknown[]) => listProspectsMock(...args),
}));

vi.mock('./prisma.js', () => ({
  getPrisma: vi.fn(() => ({
    outreachHistory: { findMany: vi.fn().mockResolvedValue([]) },
    marketIntelligenceFlywheelLog: { findMany: vi.fn().mockResolvedValue([]) },
  })),
}));

import { executeQueryLocalWorkspace, QUERY_LOCAL_WORKSPACE_DECLARATION } from './queryLocalWorkspace.js';

describe('queryLocalWorkspace', () => {
  beforeEach(() => {
    listProspectsMock.mockReset();
  });

  it('declares all three workspace query types', () => {
    expect(QUERY_LOCAL_WORKSPACE_DECLARATION.parameters.properties.queryType.enum).toEqual([
      'active_prospects',
      'outreach_history',
      'flywheel_logs',
    ]);
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
});
