import { describe, expect, it } from 'vitest';

import { ironleadsIngressSchema } from '@/app/lib/ingress/ironleadsIngressSchema';

describe('ironleadsIngressSchema', () => {
  it('accepts a valid beachhead payload', () => {
    const parsed = ironleadsIngressSchema.parse({
      companyName: 'Western Alliance Bancorporation',
      industrySector: 'REGIONAL_BHC',
      detectedTrigger: 'NEW_CISO',
      targetTenantSlug: 'vaultbank',
      contactEmail: 'ciso@example.com',
    });
    expect(parsed.companyName).toContain('Western Alliance');
  });

  it('rejects non-beachhead industry sectors', () => {
    expect(() =>
      ironleadsIngressSchema.parse({
        companyName: 'Acme Corp',
        industrySector: 'UNCLASSIFIED',
        detectedTrigger: 'REG_FINE',
        targetTenantSlug: 'vaultbank',
      }),
    ).toThrow();
  });
});
