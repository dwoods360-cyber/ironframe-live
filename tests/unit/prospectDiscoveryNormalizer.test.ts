import { describe, expect, it } from 'vitest';

import {
  coerceCompliancePressure,
  normalizeDiscoveryCandidate,
  parseDiscoveryProspectsFromModelText,
} from '../../Ironboard/src/services/prospectDiscoveryNormalizer.js';

describe('prospectDiscoveryNormalizer', () => {
  it('maps Gemini alias field names to canonical discovery rows', () => {
    const normalized = normalizeDiscoveryCandidate({
      'Legal company name': 'BancFirst Corporation',
      'Primary website domain only': 'bancfirst.bank',
      'Full website URL': 'https://www.bancfirst.bank',
      'Estimated employee count': 2260,
      compliancePressure: 'SOC2',
      recentFunding: 'NONE',
      hasComplianceJob: true,
      securityStanceSummary: 'Public security program page.',
    });
    expect(normalized).toMatchObject({
      companyName: 'BancFirst Corporation',
      domain: 'bancfirst.bank',
      employeeCount: 2260,
      compliancePressure: 'SOC2',
    });
  });

  it('coerces sector-native frameworks to SOC2 / ISO27001', () => {
    expect(coerceCompliancePressure('NERC CIP')).toBe('SOC2');
    expect(coerceCompliancePressure('HIPAA')).toBe('ISO27001');
    expect(coerceCompliancePressure('SOC2, ISO27001')).toBe('SOC2');
  });

  it('parses partial prospect arrays from fenced model JSON', () => {
    const { candidates, parseErrors } = parseDiscoveryProspectsFromModelText(`
\`\`\`json
{
  "prospects": [
    {
      "legalCompanyName": "Wintrust Financial Corporation",
      "primaryWebsiteDomain": "wintrust.com",
      "estimatedEmployeeCount": 5747,
      "compliancePressure": "SOC2",
      "recentFunding": "NONE",
      "hasComplianceJob": true
    },
    {
      "legalCompanyName": "Too Small",
      "primaryWebsiteDomain": "small.example.com",
      "estimatedEmployeeCount": 12,
      "compliancePressure": "NONE"
    }
  ]
}
\`\`\`
`);
    expect(candidates).toHaveLength(1);
    expect(candidates[0]?.companyName).toBe('Wintrust Financial Corporation');
    expect(parseErrors.length).toBeGreaterThan(0);
  });
});
