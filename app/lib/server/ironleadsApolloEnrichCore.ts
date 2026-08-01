import "server-only";

import type { Prisma } from "@prisma/client";

import {
  enrichOrganizationByDomain,
  enrichPersonByNameAndDomain,
  isApolloConfigured,
  type ApolloEnrichSnapshot,
  type ApolloOrgEnrichment,
  type ApolloPersonEnrichment,
} from "@/app/lib/server/apolloEnrichmentClient";
import { normalizeAccountDomain } from "@/app/lib/ingress/ironleadsSuspectIdentity";
import { looksLikeOsintTitleNoise } from "@/app/lib/server/ironleadsBuyingCommitteeExtract";
import { isSalesDispatchHoldCompany } from "@/app/lib/approvalDispatchValidation";
import { resolveSuspectLocationFields } from "@/app/lib/server/ironleadsSuspectLocation";
import { buildIronleadsSuspectReport } from "@/app/lib/server/ironleadsSuspectReportCore";
import prisma from "@/lib/prisma";

export type { ApolloEnrichSnapshot };

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return { ...(value as Record<string, unknown>) };
}

function splitName(fullName: string): { first: string; last: string } | null {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) return null;
  return { first: parts[0]!, last: parts.slice(1).join(" ") };
}

/**
 * HITL Apollo enrich for one SUSPECT — org by domain + optional named-buyer people match.
 * Applies work email / switchboard phone only when contact still has placeholder values.
 */
export async function enrichIronleadsSuspectWithApollo(
  contactId: string,
  options?: { applyContactFields?: boolean },
): Promise<
  | {
      ok: true;
      apollo: ApolloEnrichSnapshot;
      report: NonNullable<Awaited<ReturnType<typeof buildIronleadsSuspectReport>>>;
    }
  | { ok: false; error: string; status: number }
> {
  if (!isApolloConfigured()) {
    return {
      ok: false,
      error:
        "APOLLO_API_KEY is not set. Add it in Vercel / .env.local (Apollo → Settings → Integrations → API). Free plans may not include API access.",
      status: 503,
    };
  }

  const contact = await prisma.ironboardCrmContact.findUnique({
    where: { id: contactId },
    include: {
      primaryDeals: {
        where: { stage: "SUSPECT" },
        orderBy: { updatedAt: "desc" },
        take: 1,
      },
    },
  });
  if (!contact) {
    return { ok: false, error: "Contact not found", status: 404 };
  }
  if (contact.primaryDeals.length === 0) {
    return { ok: false, error: "Only SUSPECT-stage contacts can use Apollo enrich", status: 400 };
  }
  if (looksLikeOsintTitleNoise(contact.company) || isSalesDispatchHoldCompany(contact.company)) {
    return {
      ok: false,
      error: "Skip Apollo on title-noise or HOLD/channel-competitor rows",
      status: 400,
    };
  }

  const deal = contact.primaryDeals[0]!;
  const location = resolveSuspectLocationFields({
    metadata: contact.metadata,
    accountDomain: deal.accountDomain,
  });
  const domain =
    normalizeAccountDomain(deal.accountDomain) ||
    normalizeAccountDomain(location.websiteUrl);
  if (!domain) {
    return {
      ok: false,
      error: "Need accountDomain or websiteUrl before Apollo enrich",
      status: 400,
    };
  }

  const notes: string[] = [];
  let organization: ApolloOrgEnrichment | null = null;
  let person: ApolloPersonEnrichment | null = null;
  let personMatched = false;

  const orgResult = await enrichOrganizationByDomain(domain);
  if (!orgResult.ok) {
    return { ok: false, error: orgResult.error, status: orgResult.status };
  }
  organization = orgResult.organization;
  notes.push(`Organization enrich for ${domain}`);

  const meta = asRecord(contact.metadata);
  const namedBuyer = asRecord(meta.namedBuyer);
  let buyerName: string | null = null;
  if (typeof namedBuyer.fullName === "string" && namedBuyer.fullName.trim()) {
    buyerName = namedBuyer.fullName.trim();
  } else if (
    splitName(contact.fullName) &&
    !/ironleads|prospect|suspect/i.test(contact.fullName)
  ) {
    buyerName = contact.fullName.trim();
  }

  if (buyerName && splitName(buyerName)) {
    const personResult = await enrichPersonByNameAndDomain({
      name: buyerName,
      domain,
      revealPersonalEmails: false,
    });
    if (!personResult.ok) {
      notes.push(`Person enrich failed: ${personResult.error}`);
    } else if (personResult.matched && personResult.person) {
      person = personResult.person;
      personMatched = true;
      notes.push(`Person match for "${buyerName}"`);
    } else {
      notes.push(`No person match for "${buyerName}" — set Named buyer then retry`);
    }
  } else {
    notes.push("No named buyer — org only. Set Named buyer full name, then Enrich with Apollo again.");
  }

  const apply = options?.applyContactFields !== false;
  let appliedEmail = false;
  let appliedPhone = false;
  const contactUpdate: Prisma.IronboardCrmContactUpdateInput = {};
  const nextMeta = { ...meta };

  if (organization.websiteUrl && !location.websiteUrl) {
    nextMeta.websiteUrl = organization.websiteUrl;
  }
  if (organization.linkedinUrl) {
    nextMeta.apolloOrgLinkedinUrl = organization.linkedinUrl;
  }

  const placeholderEmail = /@ironleads\.local$/i.test(contact.email);
  if (
    apply &&
    person?.email &&
    person.emailStatus !== "unavailable" &&
    placeholderEmail
  ) {
    contactUpdate.email = person.email.toLowerCase();
    appliedEmail = true;
    notes.push(`Applied work email ${person.email}`);
  }

  if (apply && !contact.phone && organization.phone) {
    contactUpdate.phone = organization.phone;
    appliedPhone = true;
    notes.push(`Applied org phone ${organization.phone}`);
  }

  if (apply && person?.fullName && /ironleads|prospect|suspect/i.test(contact.fullName)) {
    contactUpdate.fullName = person.fullName;
  }
  if (apply && person?.title) {
    contactUpdate.title = person.title;
  }

  const apollo: ApolloEnrichSnapshot = {
    enrichedAt: new Date().toISOString(),
    domain,
    organization,
    person,
    personMatched,
    appliedEmail,
    appliedPhone,
    notes,
  };
  nextMeta.apolloEnrichment = apollo;

  contactUpdate.metadata = nextMeta as Prisma.InputJsonValue;

  await prisma.ironboardCrmContact.update({
    where: { id: contact.id },
    data: contactUpdate,
  });

  if (!deal.accountDomain) {
    await prisma.ironboardCrmDeal.update({
      where: { id: deal.id },
      data: { accountDomain: domain },
    });
  }

  const report = await buildIronleadsSuspectReport(contactId);
  if (!report) {
    return { ok: false, error: "Enriched but report reload failed", status: 500 };
  }
  return { ok: true, apollo, report };
}
