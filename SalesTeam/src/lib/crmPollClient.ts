import { z } from 'zod';

import { getIngressConfig } from '../loadSalesTeamEnv.js';

const prospectSchema = z.object({
  dealId: z.string().uuid(),
  contactId: z.string().uuid(),
  tenantId: z.string().uuid(),
  stage: z.string(),
  dealTitle: z.string(),
  valueCents: z.string(),
  company: z.string(),
  fullName: z.string(),
  email: z.string(),
  phone: z.string().nullable(),
  industrySector: z.string().nullable(),
  detectedTrigger: z.string().nullable(),
  priorityScore: z.number(),
  updatedAt: z.string(),
});

const pollResponseSchema = z.object({
  ok: z.boolean().optional(),
  tenantId: z.string().uuid(),
  prospects: z.array(prospectSchema),
  polledAt: z.string(),
});

export type ProspectRecord = z.infer<typeof prospectSchema>;

export type PollProspectsResult = {
  ok: boolean;
  status: number;
  tenantId?: string;
  prospects: ProspectRecord[];
  polledAt?: string;
  message: string;
};

export async function pollProspectQueue(limit = 50): Promise<PollProspectsResult> {
  const { baseUrl, secret, targetTenantSlug } = getIngressConfig();
  if (!secret) {
    return { ok: false, status: 503, prospects: [], message: 'SALESTEAM_INGRESS_SECRET not configured' };
  }

  const url = new URL(`${baseUrl.replace(/\/$/, '')}/api/v1/ingress/salesteam/prospects`);
  url.searchParams.set('tenantSlug', targetTenantSlug);
  url.searchParams.set('limit', String(limit));

  const response = await fetch(url, {
    method: 'GET',
    headers: { Authorization: `Bearer ${secret}` },
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
      prospects: [],
      message: err || `Poll HTTP ${response.status}`,
    };
  }

  const parsed = pollResponseSchema.safeParse(body);
  if (!parsed.success) {
    return { ok: false, status: 502, prospects: [], message: 'Invalid poll response geometry' };
  }

  return {
    ok: true,
    status: response.status,
    tenantId: parsed.data.tenantId,
    prospects: parsed.data.prospects,
    polledAt: parsed.data.polledAt,
    message: 'PROSPECT_POLL_COMPLETE',
  };
}
