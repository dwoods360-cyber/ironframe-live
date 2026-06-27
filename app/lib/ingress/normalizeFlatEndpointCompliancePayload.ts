import { z } from 'zod';
import {
  ENDPOINT_COMPLIANCE_SCHEMA_VERSION,
  endpointComplianceAssetClassSchema,
  endpointComplianceFindingStateSchema,
  endpointComplianceFrameworkSchema,
  endpointComplianceIngressSchema,
  endpointComplianceSeveritySchema,
  endpointComplianceSourceTypeSchema,
  type EndpointComplianceIngressPayload,
} from '@/app/lib/ingress/endpointComplianceIngressSchema';

const digitStringCents = z
  .string()
  .regex(/^\d+$/, 'Financial risk must be a whole number string representing integer cents');

/** Jamf/MDM-style flat integrator body (normalized to endpoint-compliance-v1 before persistence). */
export const endpointComplianceFlatIngressSchema = z.object({
  remoteTechId: z
    .string()
    .trim()
    .min(1, 'Device identifier from MDM/EDR source is mandatory')
    .max(128),
  sourceAgent: z.string().trim().min(1).max(50),
  targetEntity: z.string().trim().min(1).max(100),
  financialRisk_cents: digitStringCents,
  isRemoteAccessAuthorized: z.boolean().optional().default(false),
  complianceControlIds: z
    .array(z.string().trim().min(1).max(64))
    .min(1, 'Payload must map to at least one compliance control identifier'),
  telemetryPayload: z
    .record(z.string(), z.unknown())
    .refine((obj) => Object.keys(obj).length > 0, {
      message: 'telemetryPayload must contain vendor-specific state records',
    }),
  tenantId: z.string().uuid().optional(),
  idempotencyKey: z.string().trim().min(8).max(128).optional(),
  /** Preferred flat alias for finding title. */
  ruleTitle: z.string().trim().min(1).max(100).optional(),
  /** Legacy flat alias — maps to `finding.ruleTitle` when `ruleTitle` is absent. */
  title: z.string().trim().min(1).max(100).optional(),
  ruleId: z.string().trim().min(1).max(128).optional(),
  severity: endpointComplianceSeveritySchema.optional(),
  framework: endpointComplianceFrameworkSchema.optional(),
  findingState: endpointComplianceFindingStateSchema.optional(),
  observedAt: z.string().datetime().optional(),
  assetClass: endpointComplianceAssetClassSchema.optional(),
  justification: z.string().trim().max(2000).optional(),
});

export type EndpointComplianceFlatIngressPayload = z.infer<
  typeof endpointComplianceFlatIngressSchema
>;

export function isFlatEndpointCompliancePayload(body: unknown): body is Record<string, unknown> {
  if (body == null || typeof body !== 'object' || Array.isArray(body)) {
    return false;
  }
  const record = body as Record<string, unknown>;
  if (record.schemaVersion === ENDPOINT_COMPLIANCE_SCHEMA_VERSION) {
    return false;
  }
  return (
    typeof record.sourceAgent === 'string' &&
    typeof record.targetEntity === 'string' &&
    Array.isArray(record.complianceControlIds) &&
    record.telemetryPayload != null &&
    typeof record.telemetryPayload === 'object' &&
    !Array.isArray(record.telemetryPayload)
  );
}

function inferSourceType(
  sourceAgent: string,
): z.infer<typeof endpointComplianceSourceTypeSchema> {
  const upper = sourceAgent.toUpperCase();
  if (/JAMF|INTUNE|MDM|MOBILEIRON|KANDJI|WORKSPACE\s*ONE/.test(upper)) {
    return 'MDM';
  }
  if (/CROWD|DEFENDER|EDR|SOPHOS|TRELLIX|CARBON\s*BLACK|SENTINELONE/.test(upper)) {
    return 'EDR';
  }
  if (/SPLUNK|SIEM|QRADAR|CHRONICLE|SUMO/.test(upper)) {
    return 'SIEM';
  }
  if (/TENABLE|QUALYS|RAPID7|VULN|NESSUS/.test(upper)) {
    return 'VULN_SCANNER';
  }
  if (/CMDB|SERVICENOW|SNOW/.test(upper)) {
    return 'CMDB';
  }
  return 'MANUAL';
}

function inferFrameworkFromControls(
  controlIds: string[],
): z.infer<typeof endpointComplianceFrameworkSchema> {
  const joined = controlIds.join(' ').toUpperCase();
  if (/SOC\s*2|SOC2|CC\d/.test(joined)) return 'SOC2';
  if (/ISO\s*27001|ISO27001|ISO[-_]A\./.test(joined)) return 'ISO27001';
  if (/NIST|CSF|PR\.AC|DE\.CM/.test(joined)) return 'NIST_CSF';
  if (/HIPAA|HITECH|164\./.test(joined)) return 'HIPAA';
  if (/PCI|DSS/.test(joined)) return 'PCI_DSS';
  return 'CUSTOM';
}

/** `ruleTitle` wins when both flat title aliases are present. */
function resolveFlatRuleTitle(
  flat: EndpointComplianceFlatIngressPayload,
  primaryControl: string,
): string {
  const explicit = flat.ruleTitle?.trim();
  if (explicit) return explicit;
  const legacyTitle = flat.title?.trim();
  if (legacyTitle) return legacyTitle;
  return `Compliance drift: ${primaryControl}`;
}

function buildFlatIdempotencyKey(flat: EndpointComplianceFlatIngressPayload): string {
  if (flat.idempotencyKey?.trim()) {
    return flat.idempotencyKey.trim();
  }
  const seed = [
    flat.remoteTechId.trim(),
    flat.targetEntity.trim(),
    flat.complianceControlIds[0]?.trim() ?? 'control',
  ].join('|');
  return `flat-${seed}`.slice(0, 128);
}

/**
 * Maps legacy flat MDM payloads into the canonical endpoint-compliance-v1 contract.
 * `remoteTechId` is stored as endpoint.deviceId — not ThreatEvent.remoteTechId (specialist dispatch).
 */
export function normalizeFlatEndpointCompliancePayload(
  flat: EndpointComplianceFlatIngressPayload,
  tenantId: string,
): EndpointComplianceIngressPayload {
  const primaryControl = flat.complianceControlIds[0]?.trim() ?? 'unknown-control';
  const osVersion =
    typeof flat.telemetryPayload.osVersion === 'string'
      ? flat.telemetryPayload.osVersion
      : undefined;

  return {
    schemaVersion: ENDPOINT_COMPLIANCE_SCHEMA_VERSION,
    tenantId: flat.tenantId ?? tenantId,
    sourceType: inferSourceType(flat.sourceAgent),
    sourceIntegrationId: flat.sourceAgent.trim().slice(0, 64),
    observedAt: flat.observedAt ?? new Date().toISOString(),
    idempotencyKey: buildFlatIdempotencyKey(flat),
    endpoint: {
      deviceId: flat.remoteTechId.trim(),
      hostname: flat.targetEntity.trim(),
      assetClass: flat.assetClass ?? 'WORKSTATION',
      ...(osVersion ? { os: osVersion.slice(0, 128) } : {}),
    },
    finding: {
      controlIds: flat.complianceControlIds.map((id) => id.trim()),
      framework: flat.framework ?? inferFrameworkFromControls(flat.complianceControlIds),
      state: flat.findingState ?? 'NON_COMPLIANT',
      ruleId: flat.ruleId?.trim() ?? primaryControl,
      ruleTitle: resolveFlatRuleTitle(flat, primaryControl),
      severity: flat.severity ?? 'MEDIUM',
    },
    financialRiskCents: flat.financialRisk_cents,
    ...(flat.justification?.trim() ? { justification: flat.justification.trim() } : {}),
    isRemoteAccessAuthorized: flat.isRemoteAccessAuthorized,
    extensions: flat.telemetryPayload,
  };
}

export function parseEndpointComplianceIngress(
  body: unknown,
  tenantId: string,
):
  | { ok: true; data: EndpointComplianceIngressPayload }
  | { ok: false; error: z.ZodError } {
  if (isFlatEndpointCompliancePayload(body)) {
    const flatResult = endpointComplianceFlatIngressSchema.safeParse(body);
    if (!flatResult.success) {
      return { ok: false, error: flatResult.error };
    }
    const normalized = normalizeFlatEndpointCompliancePayload(flatResult.data, tenantId);
    const canonicalResult = endpointComplianceIngressSchema.safeParse(normalized);
    if (!canonicalResult.success) {
      return { ok: false, error: canonicalResult.error };
    }
    return { ok: true, data: canonicalResult.data };
  }

  const canonicalResult = endpointComplianceIngressSchema.safeParse(body);
  if (!canonicalResult.success) {
    return { ok: false, error: canonicalResult.error };
  }
  return { ok: true, data: canonicalResult.data };
}
