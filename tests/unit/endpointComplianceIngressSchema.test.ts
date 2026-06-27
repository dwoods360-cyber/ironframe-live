/**
 * Endpoint compliance integrator schema — Irongate-aligned validation (Phase 1).
 */
import { describe, it, expect } from 'vitest';
import {
  ENDPOINT_COMPLIANCE_SCHEMA_VERSION,
  buildEndpointComplianceFingerprint,
  endpointComplianceIngressSchema,
  endpointComplianceSeverityToScore,
} from '@/app/lib/ingress/endpointComplianceIngressSchema';

const GOLDEN_PAYLOAD = {
  schemaVersion: ENDPOINT_COMPLIANCE_SCHEMA_VERSION,
  tenantId: '5c420f5a-8f1f-4bbf-b42d-7f8dd4bb6a01',
  sourceType: 'MDM' as const,
  sourceIntegrationId: 'intune-prod-east',
  observedAt: '2026-06-27T14:30:00.000Z',
  idempotencyKey: 'intune-device-abc123-noncompliant-cc61',
  endpoint: {
    deviceId: 'abc123-device-guid',
    hostname: 'ws-finance-042.corp.example',
    assetClass: 'WORKSTATION' as const,
    site: 'NYC-HQ',
    os: 'Windows 11 Enterprise',
  },
  finding: {
    controlIds: ['SOC2-CC6.1', 'ISO-A.8.2'],
    framework: 'SOC2' as const,
    state: 'NON_COMPLIANT' as const,
    ruleId: 'disk-encryption-required',
    ruleTitle: 'Full-disk encryption disabled',
    severity: 'HIGH' as const,
    remediationDueAt: '2026-07-04T00:00:00.000Z',
    evidenceUrl: 'https://portal.example.com/evidence/abc123',
  },
  financialRiskCents: '250000000',
  justification: 'Workstation holds regulated finance data; encryption gap exceeds tenant risk appetite.',
  isRemoteAccessAuthorized: false,
};

describe('endpointComplianceIngressSchema', () => {
  it('golden path: valid endpoint compliance payload passes validation', () => {
    const result = endpointComplianceIngressSchema.safeParse(GOLDEN_PAYLOAD);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.finding.ruleTitle).toBe('Full-disk encryption disabled');
      expect(result.data.financialRiskCents).toBe('250000000');
    }
  });

  it('golden path: hostname-only endpoint identity passes', () => {
    const payload = {
      ...GOLDEN_PAYLOAD,
      endpoint: {
        hostname: 'mobile-001.corp.example',
        assetClass: 'MOBILE' as const,
      },
      finding: {
        ...GOLDEN_PAYLOAD.finding,
        severity: 'MEDIUM' as const,
      },
      financialRiskCents: undefined,
    };
    const result = endpointComplianceIngressSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });

  it('rejects missing endpoint identity (no deviceId or hostname)', () => {
    const payload = {
      ...GOLDEN_PAYLOAD,
      endpoint: {
        assetClass: 'WORKSTATION' as const,
      },
    };
    const result = endpointComplianceIngressSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });

  it('rejects invalid schemaVersion', () => {
    const payload = { ...GOLDEN_PAYLOAD, schemaVersion: 'endpoint-compliance-v0' };
    const result = endpointComplianceIngressSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });

  it('rejects financialRiskCents with decimals', () => {
    const payload = { ...GOLDEN_PAYLOAD, financialRiskCents: '250000.50' };
    const result = endpointComplianceIngressSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });

  it('requires financialRiskCents when severity is HIGH or CRITICAL', () => {
    const payload = {
      ...GOLDEN_PAYLOAD,
      financialRiskCents: undefined,
      finding: { ...GOLDEN_PAYLOAD.finding, severity: 'CRITICAL' as const },
    };
    const result = endpointComplianceIngressSchema.safeParse(payload);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes('financialRiskCents'))).toBe(true);
    }
  });

  it('rejects non-HTTPS evidenceUrl', () => {
    const payload = {
      ...GOLDEN_PAYLOAD,
      finding: {
        ...GOLDEN_PAYLOAD.finding,
        evidenceUrl: 'http://insecure.example/evidence/1',
      },
    };
    const result = endpointComplianceIngressSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });

  it('rejects empty controlIds array', () => {
    const payload = {
      ...GOLDEN_PAYLOAD,
      finding: { ...GOLDEN_PAYLOAD.finding, controlIds: [] },
    };
    const result = endpointComplianceIngressSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });
});

describe('endpointComplianceSeverityToScore', () => {
  it('maps severities to ThreatEvent score band', () => {
    expect(endpointComplianceSeverityToScore('LOW')).toBe(3);
    expect(endpointComplianceSeverityToScore('MEDIUM')).toBe(5);
    expect(endpointComplianceSeverityToScore('HIGH')).toBe(7);
    expect(endpointComplianceSeverityToScore('CRITICAL')).toBe(9);
  });
});

describe('buildEndpointComplianceFingerprint', () => {
  it('builds stable idempotency fingerprint scoped to tenant and key', () => {
    const fp = buildEndpointComplianceFingerprint(
      '5c420f5a-8f1f-4bbf-b42d-7f8dd4bb6a01',
      'intune-device-abc123-noncompliant-cc61',
    );
    expect(fp).toBe(
      'endpoint-compliance-v1|5c420f5a-8f1f-4bbf-b42d-7f8dd4bb6a01|intune-device-abc123-noncompliant-cc61',
    );
  });
});

describe('mapEndpointComplianceToThreatEvent', () => {
  it('maps validated payload to ThreatEvent create shape', async () => {
    const { mapEndpointComplianceToThreatEvent } = await import(
      '@/app/lib/ingress/mapEndpointComplianceToThreatEvent'
    );
    const parsed = endpointComplianceIngressSchema.parse(GOLDEN_PAYLOAD);
    const mapped = mapEndpointComplianceToThreatEvent(parsed, { threatId: 'threat-test-uuid' });

    expect(mapped.title).toBe('Full-disk encryption disabled');
    expect(mapped.sourceAgent).toBe('ENDPOINT:MDM:intune-prod-east');
    expect(mapped.targetEntity).toBe('ws-finance-042.corp.example');
    expect(mapped.financialRisk_cents).toBe(250000000n);
    expect(mapped.score).toBe(7);
    expect(mapped.ingestion_fingerprint).toContain('intune-device-abc123-noncompliant-cc61');

    const details = JSON.parse(mapped.ingestionDetails) as Record<string, unknown>;
    expect(details.ingestionProvenance).toBe('ENDPOINT_COMPLIANCE_V1');
    expect(details.complianceFramework).toBe('SOC2');
    expect(details.mappedControls).toEqual(['SOC2-CC6.1', 'ISO-A.8.2']);
    expect(details.endpointCompliance).toBeTruthy();
  });

  it('maps isRemoteAccessAuthorized to ThreatEvent column', async () => {
    const { mapEndpointComplianceToThreatEvent } = await import(
      '@/app/lib/ingress/mapEndpointComplianceToThreatEvent'
    );
    const parsed = endpointComplianceIngressSchema.parse({
      ...GOLDEN_PAYLOAD,
      isRemoteAccessAuthorized: true,
    });
    const mapped = mapEndpointComplianceToThreatEvent(parsed);
    expect(mapped.isRemoteAccessAuthorized).toBe(true);
  });
});

describe('normalizeFlatEndpointCompliancePayload', () => {
  const TENANT = '5c420f5a-8f1f-4bbf-b42d-7f8dd4bb6a01';

  it('normalizes Jamf-style flat payload into canonical v1 contract', async () => {
    const {
      isFlatEndpointCompliancePayload,
      normalizeFlatEndpointCompliancePayload,
      parseEndpointComplianceIngress,
    } = await import('@/app/lib/ingress/normalizeFlatEndpointCompliancePayload');

    const flat = {
      remoteTechId: 'jamf-asset-88902',
      sourceAgent: 'JAMF_MDM_PUSH_INTEGRATOR',
      targetEntity: 'production-db-replica-01',
      financialRisk_cents: '450000',
      isRemoteAccessAuthorized: false,
      complianceControlIds: ['SOC2_CC6.1', 'ISO_27001_A.12.6.1'],
      telemetryPayload: {
        osVersion: 'Darwin 24.1.0',
        patchDeltaDays: 42,
        isDiskEncrypted: false,
        filevault_status: 'DISABLED',
      },
    };

    expect(isFlatEndpointCompliancePayload(flat)).toBe(true);

    const normalized = normalizeFlatEndpointCompliancePayload(flat, TENANT);
    expect(normalized.schemaVersion).toBe('endpoint-compliance-v1');
    expect(normalized.endpoint.deviceId).toBe('jamf-asset-88902');
    expect(normalized.endpoint.hostname).toBe('production-db-replica-01');
    expect(normalized.sourceType).toBe('MDM');
    expect(normalized.finding.controlIds).toEqual(['SOC2_CC6.1', 'ISO_27001_A.12.6.1']);
    expect(normalized.extensions).toEqual(flat.telemetryPayload);

    const parsed = parseEndpointComplianceIngress(flat, TENANT);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.data.financialRiskCents).toBe('450000');
    }
  });

  it('maps flat title alias to finding.ruleTitle when ruleTitle is absent', async () => {
    const { parseEndpointComplianceIngress } = await import(
      '@/app/lib/ingress/normalizeFlatEndpointCompliancePayload'
    );

    const parsed = parseEndpointComplianceIngress(
      {
        remoteTechId: 'jamf-asset-88902',
        sourceAgent: 'JAMF_MDM_PUSH_INTEGRATOR',
        targetEntity: 'production-db-replica-01',
        financialRisk_cents: '450000',
        complianceControlIds: ['SOC2_CC6.1'],
        title: 'FileVault disabled on finance workstation',
        telemetryPayload: { isDiskEncrypted: false },
      },
      TENANT,
    );

    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.data.finding.ruleTitle).toBe('FileVault disabled on finance workstation');
    }
  });

  it('prefers ruleTitle over title when both flat aliases are sent', async () => {
    const { parseEndpointComplianceIngress } = await import(
      '@/app/lib/ingress/normalizeFlatEndpointCompliancePayload'
    );

    const parsed = parseEndpointComplianceIngress(
      {
        remoteTechId: 'jamf-asset-88902',
        sourceAgent: 'JAMF_MDM_PUSH_INTEGRATOR',
        targetEntity: 'production-db-replica-01',
        financialRisk_cents: '450000',
        complianceControlIds: ['SOC2_CC6.1'],
        title: 'Legacy title field',
        ruleTitle: 'Explicit rule title',
        telemetryPayload: { isDiskEncrypted: false },
      },
      TENANT,
    );

    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.data.finding.ruleTitle).toBe('Explicit rule title');
    }
  });

  it('does not treat canonical payloads as flat', async () => {
    const { isFlatEndpointCompliancePayload } = await import(
      '@/app/lib/ingress/normalizeFlatEndpointCompliancePayload'
    );
    expect(isFlatEndpointCompliancePayload(GOLDEN_PAYLOAD)).toBe(false);
  });
});
