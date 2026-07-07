import { loadSuccessTeamEnv, getIngressConfig } from '../loadSuccessTeamEnv.js';
import type { BeachheadSector } from '../config/beachheadSuccess.js';

loadSuccessTeamEnv();

export type AdvisoryType = 'RETENTION' | 'EXPANSION' | 'QBR' | 'ONBOARDING' | 'CHECK_IN';

export type AdvisoryIngressPayload = {
  tenantSlug: string;
  dealId: string;
  contactId: string;
  advisoryType: AdvisoryType;
  subject: string;
  body: string;
  industrySector: BeachheadSector;
  healthScore: number;
  healthBand: 'healthy' | 'watch' | 'at_risk' | 'critical';
  valueCents?: string;
  corpusPlayIds?: string[];
};

export type AdvisoryIngressResult =
  | { ok: true; interactionId: string; tenantId: string }
  | { ok: false; message: string };

export async function submitAdvisoryDraft(
  payload: AdvisoryIngressPayload,
): Promise<AdvisoryIngressResult> {
  const { baseUrl, secret } = getIngressConfig();
  if (!secret) {
    return { ok: false, message: 'SUCCESS_TEAM_INGRESS_SECRET not configured' };
  }

  const url = `${baseUrl.replace(/\/$/, '')}/api/v1/ingress/success-team/advisory`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secret}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    return { ok: false, message: `advisory ingress ${response.status}: ${text.slice(0, 200)}` };
  }

  const data = (await response.json()) as { interactionId: string; tenantId: string };
  return { ok: true, interactionId: data.interactionId, tenantId: data.tenantId };
}
