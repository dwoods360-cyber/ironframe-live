import { describe, it, expect } from 'vitest';
import { createClient } from '@supabase/supabase-js';

// SOVEREIGN TEST SUITE: Multi-Tenant Isolation (The Warden's Gate)
describe('Multi-Tenant Isolation Protocol', () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'dummy-key';

  it('🔴 CROSS-TENANT READ FAILURE: Tenant A must not see Tenant B data', async () => {
    const tenantAClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${process.env.TEST_JWT_TENANT_A}` } }
    });
    const { data: aData, error } = await tenantAClient.from('Failed_Jobs').select('*');
    expect(error).toBeNull();
    if (aData) {
      const containsTenantB = aData.some(job => job.tenant_id === process.env.TEST_TENANT_B_UUID);
      expect(containsTenantB).toBe(false);
    }
  });

  it('🔴 CROSS-TENANT WRITE FAILURE: Tenant A must not modify Tenant B data', async () => {
    const tenantAClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${process.env.TEST_JWT_TENANT_A}` } }
    });
    const targetJobId = process.env.TEST_JOB_ID_TENANT_B || 'dummy-uuid';
    const { data } = await tenantAClient.from('Failed_Jobs').update({ status: 'COMPROMISED' }).eq('id', targetJobId).select();
    expect(data?.length).toBe(0);
  });
});
