import { describe, expect, it } from 'vitest';

import { GRC_SALES_PLAYBOOK } from '../agents/sales/playbook.js';

describe('GRC_SALES_PLAYBOOK manifest', () => {
  it('defines deterministic tiers for each beachhead segment without pre-seeded company names', () => {
    expect(Object.keys(GRC_SALES_PLAYBOOK).sort()).toEqual([
      'communityHealth',
      'publicPower',
      'regionalBHC',
    ]);
    expect(GRC_SALES_PLAYBOOK.communityHealth.name).toBe('Regional Community Health System');
    expect(GRC_SALES_PLAYBOOK.communityHealth.complianceFrameworks).toContain('HIPAA Security Rule');
    expect(GRC_SALES_PLAYBOOK.regionalBHC.icpCriteria).toContain('$10B');
    expect(GRC_SALES_PLAYBOOK.publicPower.icpCriteria).toContain('NERC CIP');
    for (const tier of Object.values(GRC_SALES_PLAYBOOK)) {
      expect('exampleOrganizations' in tier).toBe(false);
      expect(tier.icpCriteria.length).toBeGreaterThan(20);
    }
  });

  it('exposes playbook tiers addressable by beachhead key', () => {
    expect(GRC_SALES_PLAYBOOK['UnknownTier' as keyof typeof GRC_SALES_PLAYBOOK]).toBeUndefined();
    expect(GRC_SALES_PLAYBOOK.publicPower.targetALE).toContain('NERC CIP');
  });
});
