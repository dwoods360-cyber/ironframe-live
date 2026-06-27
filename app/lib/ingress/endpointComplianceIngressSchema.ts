import { z } from 'zod';

/** Canonical integrator contract version for endpoint compliance signals. */
export const ENDPOINT_COMPLIANCE_SCHEMA_VERSION = 'endpoint-compliance-v1' as const;

const digitStringCents = z
  .string()
  .regex(/^\d+$/, 'must be a string of pure digits (no decimals or letters)');

const httpsUrl = z
  .string()
  .url('must be a valid URL')
  .refine((value) => value.startsWith('https://'), {
    message: 'evidenceUrl must use HTTPS',
  });

export const endpointComplianceSourceTypeSchema = z.enum([
  'MDM',
  'EDR',
  'VULN_SCANNER',
  'SIEM',
  'CMDB',
  'MANUAL',
]);

export const endpointComplianceFrameworkSchema = z.enum([
  'SOC2',
  'ISO27001',
  'NIST_CSF',
  'HIPAA',
  'PCI_DSS',
  'CUSTOM',
]);

export const endpointComplianceFindingStateSchema = z.enum([
  'NON_COMPLIANT',
  'COMPLIANT',
  'UNKNOWN',
  'EXCEPTION_GRANTED',
]);

export const endpointComplianceSeveritySchema = z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);

export const endpointComplianceAssetClassSchema = z.enum([
  'WORKSTATION',
  'SERVER',
  'MOBILE',
  'NETWORK',
  'OTHER',
]);

export const endpointComplianceEndpointSchema = z
  .object({
    deviceId: z.string().trim().min(1).max(128).optional(),
    hostname: z.string().trim().min(1).max(253).optional(),
    assetClass: endpointComplianceAssetClassSchema,
    ownerEmail: z.string().trim().email().max(320).optional(),
    site: z.string().trim().max(128).optional(),
    os: z.string().trim().max(128).optional(),
  })
  .superRefine((endpoint, ctx) => {
    if (!endpoint.deviceId && !endpoint.hostname) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'endpoint.deviceId or endpoint.hostname is required',
        path: ['endpoint'],
      });
    }
  });

export const endpointComplianceFindingSchema = z.object({
  controlIds: z.array(z.string().trim().min(1).max(64)).min(1).max(32),
  framework: endpointComplianceFrameworkSchema,
  state: endpointComplianceFindingStateSchema,
  ruleId: z.string().trim().min(1).max(128),
  ruleTitle: z.string().trim().min(1).max(100),
  severity: endpointComplianceSeveritySchema,
  remediationDueAt: z.string().datetime().optional(),
  evidenceUrl: httpsUrl.optional(),
});

export const endpointComplianceIngressSchema = z
  .object({
    schemaVersion: z.literal(ENDPOINT_COMPLIANCE_SCHEMA_VERSION),
    tenantId: z.string().uuid(),
    sourceType: endpointComplianceSourceTypeSchema,
    sourceIntegrationId: z.string().trim().min(1).max(64),
    observedAt: z.string().datetime(),
    idempotencyKey: z.string().trim().min(8).max(128),
    endpoint: endpointComplianceEndpointSchema,
    finding: endpointComplianceFindingSchema,
    financialRiskCents: digitStringCents.optional(),
    justification: z.string().trim().max(2000).optional(),
    isRemoteAccessAuthorized: z.boolean().optional().default(false),
    extensions: z.record(z.string(), z.unknown()).optional(),
  })
  .superRefine((payload, ctx) => {
    const severity = payload.finding.severity;
    if ((severity === 'HIGH' || severity === 'CRITICAL') && !payload.financialRiskCents) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'financialRiskCents is required when finding.severity is HIGH or CRITICAL',
        path: ['financialRiskCents'],
      });
    }
  });

export type EndpointComplianceIngressPayload = z.infer<typeof endpointComplianceIngressSchema>;

/** Map integrator severity to ThreatEvent score (1–10). */
export function endpointComplianceSeverityToScore(
  severity: z.infer<typeof endpointComplianceSeveritySchema>,
): number {
  switch (severity) {
    case 'LOW':
      return 3;
    case 'MEDIUM':
      return 5;
    case 'HIGH':
      return 7;
    case 'CRITICAL':
      return 9;
    default:
      return 5;
  }
}

/** Stable fingerprint for ThreatEvent.ingestion_fingerprint idempotency. */
export function buildEndpointComplianceFingerprint(
  tenantId: string,
  idempotencyKey: string,
): string {
  const normalizedTenant = tenantId.trim().toLowerCase();
  const normalizedKey = idempotencyKey.trim();
  return `${ENDPOINT_COMPLIANCE_SCHEMA_VERSION}|${normalizedTenant}|${normalizedKey}`;
}
