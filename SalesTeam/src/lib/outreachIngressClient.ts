import { z } from 'zod';

import type { BeachheadSector } from '../config/beachheadPrompts.js';
import { getIngressConfig } from '../loadSalesTeamEnv.js';
import type { OutreachChannel } from '../loadSalesTeamEnv.js';

const outreachResponseSchema = z.object({
  ok: z.boolean().optional(),
  interactionId: z.string().uuid(),
  tenantId: z.string().uuid(),
  status: z.literal('PENDING_HUMAN_REVIEW'),
});

export type OutreachIngressPayload = {
  tenantSlug: string;
  dealId: string;
  contactId: string;
  channel: OutreachChannel;
  subject: string;
  body: string;
  industrySector: BeachheadSector;
  lossExposureCents?: string;
};

export type OutreachIngressResult = {
  ok: boolean;
  status: number;
  interactionId?: string;
  message: string;
};

export async function submitOutreachDraft(
  input: OutreachIngressPayload,
): Promise<OutreachIngressResult> {
  const { baseUrl, secret, targetTenantSlug } = getIngressConfig();
  if (!secret) {
    return { ok: false, status: 503, message: 'SALESTEAM_INGRESS_SECRET not configured' };
  }

  const url = `${baseUrl.replace(/\/$/, '')}/api/v1/ingress/salesteam/outreach`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secret}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ...input,
      tenantSlug: input.tenantSlug || targetTenantSlug,
    }),
  });

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    body = {};
  }

  if (!response.ok) {
    const err =
      body && typeof body === 'object' && 'error' in body ? String((body as { error: unknown }).error) : undefined;
    return {
      ok: false,
      status: response.status,
      message: err || `Outreach HTTP ${response.status}`,
    };
  }

  const parsed = outreachResponseSchema.safeParse(body);
  if (!parsed.success) {
    return { ok: false, status: 502, message: 'Invalid outreach response geometry' };
  }

  return {
    ok: true,
    status: response.status,
    interactionId: parsed.data.interactionId,
    message: parsed.data.status,
  };
}
