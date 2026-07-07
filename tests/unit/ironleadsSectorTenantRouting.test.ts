import { describe, expect, it } from 'vitest';

import {
  PROSPECT_POOL_TENANT_SLUG,
  resolveTargetTenantSlugForSector,
} from '@/Ironleads/src/lib/sectorTenantRouting';

describe('ironleads sector tenant routing', () => {
  it('maps beachhead sectors to seeded industrial tenant slugs', () => {
    expect(resolveTargetTenantSlugForSector('REGIONAL_BHC')).toBe('vaultbank');
    expect(resolveTargetTenantSlugForSector('UTILITY_NERC')).toBe('gridcore');
    expect(resolveTargetTenantSlugForSector('HEALTH_HIPAA')).toBe('medshield');
    expect(resolveTargetTenantSlugForSector('MSSP_ENCLAVE')).toBe(PROSPECT_POOL_TENANT_SLUG);
  });

  it('falls back to prospect pool for unknown sectors', () => {
    expect(resolveTargetTenantSlugForSector('UNKNOWN_SECTOR')).toBe(PROSPECT_POOL_TENANT_SLUG);
    expect(resolveTargetTenantSlugForSector('UNKNOWN_SECTOR', 'custom-pool')).toBe('custom-pool');
  });
});
