import { loadSupportTeamEnv, getIngressConfig } from '../loadSupportTeamEnv.js';

loadSupportTeamEnv();

export type SupportSeverityTier = 'T1_CRITICAL' | 'T2_ELEVATED' | 'T3_ROUTINE';

export type SupportReplyIngressPayload = {
  tenantSlug: string;
  intakeInteractionId: string;
  contactId: string;
  subject: string;
  body: string;
  severityTier: SupportSeverityTier;
  corpusPlayIds?: string[];
};

export type SupportReplyIngressResult =
  | { ok: true; interactionId: string; tenantId: string }
  | { ok: false; message: string };

export async function submitSupportReplyDraft(
  payload: SupportReplyIngressPayload,
): Promise<SupportReplyIngressResult> {
  const { baseUrl, secret } = getIngressConfig();
  if (!secret) {
    return { ok: false, message: 'SUPPORT_TEAM_INGRESS_SECRET not configured' };
  }

  const url = `${baseUrl.replace(/\/$/, '')}/api/v1/ingress/support-team/reply`;
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
    return { ok: false, message: `reply ingress ${response.status}: ${text.slice(0, 200)}` };
  }

  const data = (await response.json()) as { interactionId: string; tenantId: string };
  return { ok: true, interactionId: data.interactionId, tenantId: data.tenantId };
}
