import "server-only";

import type { Prisma } from "@prisma/client";

import { normalizeAccountDomain } from "@/app/lib/ingress/ironleadsSuspectIdentity";
import { looksLikeOsintTitleNoise } from "@/app/lib/server/ironleadsBuyingCommitteeExtract";
import { isSalesDispatchHoldCompany } from "@/app/lib/approvalDispatchValidation";
import { emailMatchesAccountDomain } from "@/app/lib/server/ironleadsAccountResearchBrief";
import {
  enrichPersonWithGetProspect,
  isGetProspectConfigured,
  isGetProspectEmailPromoteReady,
  type GetProspectEnrichSnapshot,
} from "@/app/lib/server/getprospectEnrichmentClient";
import { resolveSuspectLocationFields } from "@/app/lib/server/ironleadsSuspectLocation";
import { buildIronleadsSuspectReport } from "@/app/lib/server/ironleadsSuspectReportCore";
import { withProspectPoolTenant } from "@/app/lib/server/ironleadsTenantScope";

export type { GetProspectEnrichSnapshot };

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return { ...(value as Record<string, unknown>) };
}

function splitName(fullName: string): { first: string; last: string } | null {
  const parts = fullName
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .filter((p) => !/^[A-Z]\.?$/i.test(p));
  if (parts.length < 2) return null;
  return { first: parts[0]!, last: parts[parts.length - 1]! };
}

/**
 * GetProspect finder for one SUSPECT after the buyer name is confirmed.
 * Applies the inbox only when status is valid on the employer domain.
 */
export async function enrichIronleadsSuspectWithGetProspect(
  contactId: string,
  options?: { applyContactFields?: boolean },
): Promise<
  | {
      ok: true;
      getprospect: GetProspectEnrichSnapshot;
      report: NonNullable<Awaited<ReturnType<typeof buildIronleadsSuspectReport>>>;
    }
  | { ok: false; error: string; status: number }
> {
  if (!isGetProspectConfigured()) {
    return { ok: false, error: "GETPROSPECT_API_KEY is not set.", status: 503 };
  }

  const contact = await withProspectPoolTenant((tx, tenantId) =>
    tx.ironboardCrmContact.findFirst({
      where: { id: contactId, tenantId },
      include: {
        primaryDeals: {
          where: { stage: "SUSPECT" },
          orderBy: { updatedAt: "desc" },
          take: 1,
        },
      },
    }),
  );
  if (!contact) return { ok: false, error: "Contact not found", status: 404 };
  if (contact.primaryDeals.length === 0) {
    return { ok: false, error: "Only SUSPECT-stage contacts can use GetProspect enrich", status: 400 };
  }
  if (looksLikeOsintTitleNoise(contact.company) || isSalesDispatchHoldCompany(contact.company)) {
    return {
      ok: false,
      error: "Skip GetProspect on title-noise or HOLD/channel-competitor rows",
      status: 400,
    };
  }

  const deal = contact.primaryDeals[0]!;
  const location = resolveSuspectLocationFields({
    metadata: contact.metadata,
    accountDomain: deal.accountDomain,
  });
  const domain =
    normalizeAccountDomain(deal.accountDomain) || normalizeAccountDomain(location.websiteUrl);
  if (!domain) {
    return { ok: false, error: "Need accountDomain or websiteUrl before GetProspect enrich", status: 400 };
  }

  const notes: string[] = [];
  const meta = asRecord(contact.metadata);
  const namedBuyer = asRecord(meta.namedBuyer);
  let buyerName: string | null = null;
  if (typeof namedBuyer.fullName === "string" && namedBuyer.fullName.trim()) {
    buyerName = namedBuyer.fullName.trim();
  } else if (splitName(contact.fullName) && !/ironleads|prospect|suspect/i.test(contact.fullName)) {
    buyerName = contact.fullName.trim();
  }
  const nameParts = buyerName ? splitName(buyerName) : null;
  if (!buyerName || !nameParts) {
    return {
      ok: false,
      error: "Set Named buyer full name (first + last) before Enrich with GetProspect",
      status: 400,
    };
  }

  const personResult = await enrichPersonWithGetProspect({
    domain,
    firstName: nameParts.first,
    lastName: nameParts.last,
  });
  if (!personResult.ok) {
    return { ok: false, error: personResult.error, status: personResult.status };
  }

  const person = personResult.person;
  const personMatched = personResult.matched;
  if (personMatched && person?.email) {
    notes.push(
      `Person match for "${buyerName}" (GetProspect status=${person.emailStatus ?? "n/a"}, domain_status=${person.domainStatus ?? "n/a"})`,
    );
  } else if (person?.domainStatus) {
    notes.push(
      `No verified mailbox for "${buyerName}" (domain_status=${person.domainStatus})`,
    );
  } else {
    notes.push(`No person match for "${buyerName}"`);
  }

  const apply = options?.applyContactFields !== false;
  let appliedEmail = false;
  const contactUpdate: Prisma.IronboardCrmContactUpdateInput = {};
  const nextMeta = { ...meta };
  const now = new Date().toISOString();
  const placeholderEmail = /@ironleads\.local$/i.test(contact.email);
  const verifiedOk = person ? isGetProspectEmailPromoteReady(person) : false;
  const employerEmailOk =
    Boolean(person?.email) && verifiedOk && emailMatchesAccountDomain(person?.email ?? null, domain);

  if (person?.email && !verifiedOk) {
    notes.push(
      `GetProspect returned ${person.email} with status=${person.emailStatus ?? "unknown"} — only status=valid is saved`,
    );
  }
  if (person?.email && verifiedOk && !employerEmailOk) {
    notes.push(`Rejected GetProspect email ${person.email} — not on employer domain ${domain}`);
  }
  if (apply && person?.email && employerEmailOk && placeholderEmail) {
    contactUpdate.email = person.email.toLowerCase();
    appliedEmail = true;
    notes.push(`Applied work email ${person.email}`);
  }

  if (person?.email && employerEmailOk) {
    nextMeta.namedBuyer = {
      ...namedBuyer,
      fullName: buyerName,
      email: person.email,
      emailStatus: "valid",
      source: "getprospect_email-finder",
      verifiedAt: now,
    };
  }

  const getprospect: GetProspectEnrichSnapshot = {
    enrichedAt: now,
    domain,
    person,
    personMatched,
    appliedEmail,
    notes,
  };
  nextMeta.getprospectEnrichment = getprospect;
  contactUpdate.metadata = nextMeta as Prisma.InputJsonValue;

  await withProspectPoolTenant(async (tx, tenantId) => {
    await tx.ironboardCrmContact.updateMany({
      where: { id: contact.id, tenantId },
      data: contactUpdate,
    });
  });

  const report = await buildIronleadsSuspectReport(contactId);
  if (!report) return { ok: false, error: "Enriched but report reload failed", status: 500 };
  return { ok: true, getprospect, report };
}
