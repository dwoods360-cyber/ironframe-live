import { randomUUID } from 'crypto';
import { ThreatState } from '@prisma/client';
import { mergeIngestionDetailsPatch } from '@/app/utils/ingestionDetailsMerge';
import {
  buildEndpointComplianceFingerprint,
  endpointComplianceSeverityToScore,
  type EndpointComplianceIngressPayload,
} from '@/app/lib/ingress/endpointComplianceIngressSchema';

const DEFAULT_TTL_SECONDS = 259200;

export type EndpointComplianceThreatCreateInput = {
  id: string;
  title: string;
  sourceAgent: string;
  score: number;
  targetEntity: string;
  financialRisk_cents: bigint;
  isRemoteAccessAuthorized: boolean;
  status: ThreatState;
  ttlSeconds: number;
  tenantCompanyId?: bigint;
  aiReport: string;
  ingestionDetails: string;
  ingestion_fingerprint: string;
};

export function mapEndpointComplianceToThreatEvent(
  payload: EndpointComplianceIngressPayload,
  options?: { companyId?: bigint | null; threatId?: string },
): EndpointComplianceThreatCreateInput {
  const targetEntity = payload.endpoint.hostname ?? payload.endpoint.deviceId ?? 'UNKNOWN';
  const sourceAgent = `ENDPOINT:${payload.sourceType}:${payload.sourceIntegrationId}`;
  const financialRisk_cents = BigInt(payload.financialRiskCents ?? '0');
  const score = endpointComplianceSeverityToScore(payload.finding.severity);
  const threatId = options?.threatId ?? randomUUID();

  const aiReport = [
    `Endpoint compliance (${payload.sourceType}/${payload.sourceIntegrationId})`,
    `State: ${payload.finding.state}`,
    `Rule: ${payload.finding.ruleId}`,
    `Framework: ${payload.finding.framework}`,
    `Controls: ${payload.finding.controlIds.join(', ')}`,
    `Observed: ${payload.observedAt}`,
  ].join(' · ');

  const ingestionDetails = mergeIngestionDetailsPatch(null, {
    sourcePlane: 'ENDPOINT_INTEGRATOR',
    ingestionProvenance: 'ENDPOINT_COMPLIANCE_V1',
    assigned_to: 'User_00',
    owner_id: 'User_00',
    constitutionalAuthority: 'User_00',
    threadId: threatId,
    orchestrationThreadId: threatId,
    ...(payload.justification?.trim()
      ? { grcJustification: payload.justification.trim() }
      : {}),
    complianceFramework: payload.finding.framework,
    mappedControls: payload.finding.controlIds,
    endpointCompliance: {
      schemaVersion: payload.schemaVersion,
      tenantId: payload.tenantId,
      sourceType: payload.sourceType,
      sourceIntegrationId: payload.sourceIntegrationId,
      observedAt: payload.observedAt,
      idempotencyKey: payload.idempotencyKey,
      endpoint: payload.endpoint,
      finding: payload.finding,
      financialRiskCents: payload.financialRiskCents ?? '0',
      isRemoteAccessAuthorized: payload.isRemoteAccessAuthorized ?? false,
      ...(payload.extensions ? { extensions: payload.extensions } : {}),
    },
  });

  return {
    id: threatId,
    title: payload.finding.ruleTitle,
    sourceAgent,
    score,
    targetEntity,
    financialRisk_cents,
    isRemoteAccessAuthorized: payload.isRemoteAccessAuthorized ?? false,
    status: ThreatState.IDENTIFIED,
    ttlSeconds: DEFAULT_TTL_SECONDS,
    ...(options?.companyId != null ? { tenantCompanyId: options.companyId } : {}),
    aiReport,
    ingestionDetails,
    ingestion_fingerprint: buildEndpointComplianceFingerprint(
      payload.tenantId,
      payload.idempotencyKey,
    ),
  };
}
