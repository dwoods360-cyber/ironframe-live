import { loadIronleadsEnv, getIngressConfig } from '../loadIronleadsEnv.js';
import { shipToIronframeIngress, type IngressPayload } from '../lib/ingressClient.js';
import { getIronleadsPrisma } from '../lib/prisma.js';
import { resolveTargetTenantSlugForSector } from '../lib/sectorTenantRouting.js';

loadIronleadsEnv();

export type LeadGatekeeperResult = {
  qualifiedLeadId: string;
  shipped: boolean;
  contactId?: string;
  dealId?: string;
  message: string;
};

/** Agent L-03 — sanitize, sign via bearer, ship to Irongate ingress. */
export async function runLeadGatekeeper(limit = 10): Promise<LeadGatekeeperResult[]> {
  const prisma = getIronleadsPrisma();
  const { targetTenantSlug: defaultTenantSlug } = getIngressConfig();
  const staged = await prisma.qualifiedLead.findMany({
    where: { processingStatus: 'QUALIFIED' },
    orderBy: [{ confidenceScore: 'desc' }, { createdAt: 'asc' }],
    take: limit,
  });

  const results: LeadGatekeeperResult[] = [];

  for (const lead of staged) {
    const payload: IngressPayload = {
      companyName: lead.companyName,
      industrySector: lead.industrySector as IngressPayload['industrySector'],
      detectedTrigger: lead.detectedTrigger,
      targetTenantSlug: resolveTargetTenantSlugForSector(lead.industrySector, defaultTenantSlug),
      contactEmail: lead.contactEmail ?? undefined,
      accountDomain: lead.accountDomain ?? undefined,
    };

    const ingress = await shipToIronframeIngress(payload);

    if (!ingress.ok) {
      results.push({
        qualifiedLeadId: lead.id,
        shipped: false,
        message: ingress.message,
      });
      continue;
    }

    await prisma.qualifiedLead.update({
      where: { id: lead.id },
      data: {
        processingStatus: 'SHIPPED',
        shippedAt: new Date(),
        ironframeContactId: ingress.contactId ?? null,
        ironframeDealId: ingress.dealId ?? null,
      },
    });

    results.push({
      qualifiedLeadId: lead.id,
      shipped: true,
      contactId: ingress.contactId,
      dealId: ingress.dealId,
      message: ingress.message,
    });
  }

  return results;
}
