import { z } from 'zod';

import { getIngressConfig } from '../loadIronleadsEnv.js';
import { sanitizeCompanyName, sanitizeDomain, sanitizeEmail, sanitizeTrigger } from './sanitizer.js';

const ingressResponseSchema = z.object({
  success: z.boolean().optional(),
  contactId: z.string().optional(),
  dealId: z.string().optional(),
  message: z.string().optional(),
  error: z.string().optional(),
});

export type IngressPayload = {
  companyName: string;
  industrySector: 'REGIONAL_BHC' | 'UTILITY_NERC' | 'MSSP_ENCLAVE' | 'HEALTH_HIPAA';
  detectedTrigger: string;
  targetTenantSlug: string;
  contactEmail?: string;
  contactName?: string;
  accountDomain?: string;
};

export type IngressResult = {
  ok: boolean;
  contactId?: string;
  dealId?: string;
  status: number;
  message: string;
};

export function buildIngressPayload(input: IngressPayload): IngressPayload {
  return {
    companyName: sanitizeCompanyName(input.companyName),
    industrySector: input.industrySector,
    detectedTrigger: sanitizeTrigger(input.detectedTrigger),
    targetTenantSlug: input.targetTenantSlug.trim().slice(0, 63),
    contactEmail: sanitizeEmail(input.contactEmail),
    contactName: input.contactName ? sanitizeCompanyName(input.contactName) : undefined,
    accountDomain: sanitizeDomain(input.accountDomain),
  };
}

export async function shipToIronframeIngress(input: IngressPayload): Promise<IngressResult> {
  const { baseUrl, secret, targetTenantSlug } = getIngressConfig();
  if (!secret) {
    return { ok: false, status: 503, message: 'IRONLEADS_INGRESS_SECRET not configured' };
  }

  const payload = buildIngressPayload({
    ...input,
    targetTenantSlug: input.targetTenantSlug || targetTenantSlug,
  });

  if (!payload.companyName || payload.companyName.length < 2) {
    return { ok: false, status: 400, message: 'Invalid company name after sanitization' };
  }

  const url = `${baseUrl.replace(/\/$/, '')}/api/v1/ingress/ironleads`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secret}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    body = {};
  }

  const parsed = ingressResponseSchema.safeParse(body);
  if (!response.ok) {
    const err = parsed.success ? parsed.data.error : undefined;
    return {
      ok: false,
      status: response.status,
      message: err || `Ingress HTTP ${response.status}`,
    };
  }

  const data = parsed.success ? parsed.data : {};
  return {
    ok: true,
    status: response.status,
    contactId: data.contactId,
    dealId: data.dealId,
    message: data.message || 'PERIMETER_INGRESS_COMPLETE',
  };
}
