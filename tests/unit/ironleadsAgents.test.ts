import { describe, expect, it } from 'vitest';

import { extractSignalFromText } from '@/Ironleads/src/agents/signalFilter';
import { assertUrlOnAllowlist } from '@/Ironleads/src/config/allowlistedSources';
import { buildIngressPayload } from '@/Ironleads/src/lib/ingressClient';
import { sanitizeCompanyName, stripHtml } from '@/Ironleads/src/lib/sanitizer';

describe('ironleadsAgents', () => {
  it('strips script tags deterministically', () => {
    const clean = stripHtml('<script>alert(1)</script>Acme Bank');
    expect(clean).not.toContain('<script');
    expect(clean).toContain('Acme Bank');
  });

  it('rejects non-allowlisted hosts', () => {
    expect(() => assertUrlOnAllowlist('https://evil.example.com/data')).toThrow(/allowlist/i);
  });

  it('allows fixture sources for local dev', () => {
    const source = assertUrlOnAllowlist('fixture://regional-bhc-sample');
    expect(source.id).toBe('ironleads_fixture_regional_bhc');
  });

  it('extracts regional BHC company and triggers from fixture text', () => {
    const text =
      'Western Alliance Bancorporation cited for FFIEC enforcement deficiencies. Chief Information Security Officer role posted.';
    const extracted = extractSignalFromText(text, 'ironleads_fixture_regional_bhc');
    expect(extracted).not.toBeNull();
    expect(extracted?.industrySector).toBe('REGIONAL_BHC');
    expect(extracted?.detectedTrigger).toContain('REG_FINE');
    expect(extracted?.companyName).toMatch(/Western Alliance/i);
    expect(extracted?.confidenceScore).toBeGreaterThanOrEqual(45);
  });

  it('extracts MSSP signals from fixture text', () => {
    const text =
      'Pivot Point Security expands vCISO practice — hiring GRC analysts for multi-client command posts.';
    const extracted = extractSignalFromText(text, 'ironleads_fixture_mssp');
    expect(extracted?.industrySector).toBe('MSSP_ENCLAVE');
    expect(extracted?.detectedTrigger).toContain('COMPLIANCE_JOB_POST');
  });

  it('builds sanitized ingress payload', () => {
    const payload = buildIngressPayload({
      companyName: '<b>Acme</b> Bancorp',
      industrySector: 'REGIONAL_BHC',
      detectedTrigger: 'new_ciso',
      targetTenantSlug: 'vaultbank',
    });
    expect(payload.companyName).toBe('Acme Bancorp');
    expect(payload.detectedTrigger).toBe('NEW_CISO');
    expect(sanitizeCompanyName('  Test  ')).toBe('Test');
  });
});
