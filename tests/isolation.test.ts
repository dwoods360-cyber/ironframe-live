import 'dotenv/config';
import { describe, it, expect } from 'vitest';
import { createClient } from '@supabase/supabase-js';

// SOVEREIGN TEST SUITE: Multi-Tenant Isolation Protocol
describe('Multi-Tenant Isolation Protocol (RLS Warden)', () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  it('🔴 CROSS-TENANT READ FAILURE: Tenant A must not see Tenant B data', async () => {
    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn('⚠️ Skipping test: Missing Supabase environment variables.');
      return;
    }

    // Mock Tenant A Session via JWT
    const tenantAClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${process.env.TEST_JWT_TENANT_A || 'dummy-jwt'}` } }
    });

    const { data: aData, error } = await tenantAClient.from('Failed_Jobs').select('*');

    // We expect NO error, just an empty array because RLS blocked the read
    expect(error).toBeNull();
    if (aData) {
      const containsTenantB = aData.some(job => job.tenant_id === (process.env.TEST_TENANT_B_UUID || 'dummy-uuid'));
      expect(containsTenantB).toBe(false);
    }
  });

  it('🔴 CROSS-TENANT WRITE FAILURE: Tenant A must not modify Tenant B data', async () => {
    if (!supabaseUrl || !supabaseAnonKey) return;

    const tenantAClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${process.env.TEST_JWT_TENANT_A || 'dummy-jwt'}` } }
    });

    const targetJobId = process.env.TEST_JOB_ID_TENANT_B || '00000000-0000-0000-0000-000000000000';

    const { data } = await tenantAClient
      .from('Failed_Jobs')
      .update({ status: 'COMPROMISED' })
      .eq('id', targetJobId)
      .select();

    // Validation: RLS should return an empty array (0 rows updated)
    expect(data?.length || 0).toBe(0);
  });
});
