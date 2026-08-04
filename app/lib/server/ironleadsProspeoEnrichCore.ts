import "server-only";

import type { Prisma } from "@prisma/client";

import { normalizeAccountDomain } from "@/app/lib/ingress/ironleadsSuspectIdentity";
import { looksLikeOsintTitleNoise } from "@/app/lib/server/ironleadsBuyingCommitteeExtract";
import { isSalesDispatchHoldCompany } from "@/app/lib/approvalDispatchValidation";
import {
  enrichPersonWithProspeo,
  isProspeoConfigured,
  type ProspeoEnrichSnapshot,
} from "@/app/lib/server/prospeoEnrichmentClient";
import { resolveSuspectLocationFields } from "@/app/lib/server/ironleadsSuspectLocation";
import { buildIronleadsSuspectReport } from "@/app/lib/server/ironleadsSuspectReportCore";
import prisma from "@/lib/prisma";

export type { ProspeoEnrichSnapshot };

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return { ...(value as Record<string, unknown>) };
}

function splitName(fullName: string): { first: string; last: string } | null {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) return null;
  return { first: parts[0]!, last: parts.slice(1).join(" ") };
}

function resolveLinkedinHint(meta: Record<string, unknown>, buyerName: string): string | null {
  const namedBuyer = asRecord(meta.namedBuyer);
  if (typeof namedBuyer.linkedinUrl === "string" && namedBuyer.linkedinUrl.trim()) {
    return namedBuyer.linkedinUrl.trim();
  }

  const committee = asRecord(meta.buyingCommittee);
  const members = Array.isArray(committee.members) ? committee.members : [];
  const needle = buyerName.trim().toLowerCase();
  for (const raw of members) {
    const member = asRecord(raw);
    const name = typeof member.fullName === "string" ? member.fullName.trim().toLowerCase() : "";
    if (name && name === needle && typeof member.linkedinUrl === "string" && member.linkedinUrl.trim()) {
      return member.linkedinUrl.trim();
    }
  }
  return null;
}

/**
 * HITL Prospeo enrich for one SUSPECT — named buyer + domain → verified work email.
 * Applies email only when contact still has placeholder @ironleads.local.
 */
export async function enrichIronleadsSuspectWithProspeo(
  contactId: string,
  options?: { applyContactFields?: boolean },
): Promise<
  | {
      ok: true;
      prospeo: ProspeoEnrichSnapshot;
      report: NonNullable<Awaited<ReturnType<typeof buildIronleadsSuspectReport>>>;
    }
  | { ok: false; error: string; status: number }
> {
  if (!isProspeoConfigured()) {
    return {
      ok: false,
      error:
        "PROSPEO_API_KEY is not set. Add it in Vercel / .env.local (Prospeo dashboard → API key).",
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
    return { ok: false, error: "Only SUSPECT-stage contacts can use Prospeo enrich", status: 400 };
  }
  if (looksLikeOsintTitleNoise(contact.company) || isSalesDispatchHoldCompany(contact.company)) {
    return {
      ok: false,
      error: "Skip Prospeo on title-noise or HOLD/channel-competitor rows",
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
      error: "Need accountDomain or websiteUrl before Prospeo enrich",
      status: 400,
    };
  }

  const notes: string[] = [];
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

  if (!buyerName || !splitName(buyerName)) {
    return {
      ok: false,
      error: "Set Named buyer full name (first + last) before Enrich with Prospeo",
      status: 400,
    };
  }

  const nameParts = splitName(buyerName)!;
  const linkedinUrl = resolveLinkedinHint(meta, buyerName);
  const personResult = await enrichPersonWithProspeo({
    fullName: buyerName,
    domain,
    companyName: contact.company,
    linkedinUrl,
    firstName: nameParts.first,
    lastName: nameParts.last,
    onlyVerifiedEmail: false,
  });

  if (!personResult.ok) {
    return { ok: false, error: personResult.error, status: personResult.status };
  }

  const person = personResult.person;
  const personMatched = personResult.matched;
  if (personMatched && person) {
    notes.push(`Person match for "${buyerName}"`);
  } else {
    notes.push(`No person match for "${buyerName}" — verify name/domain or try LinkedIn URL`);
  }

  const apply = options?.applyContactFields !== false;
  let appliedEmail = false;
  const contactUpdate: Prisma.IronboardCrmContactUpdateInput = {};
  const nextMeta = { ...meta };
  const now = new Date().toISOString();

  const placeholderEmail = /@ironleads\.local$/i.test(contact.email);
  const emailOk =
    Boolean(person?.email) &&
    person?.emailStatus !== "INVALID" &&
    person?.emailStatus !== "unavailable";

  if (apply && person?.email && emailOk && placeholderEmail) {
    contactUpdate.email = person.email.toLowerCase();
    appliedEmail = true;
    notes.push(`Applied work email ${person.email}`);
  } else if (person?.email && emailOk && !placeholderEmail) {
    notes.push("Contact already has a non-placeholder email — left unchanged");
  }

  if (apply && person?.fullName && /ironleads|prospect|suspect/i.test(contact.fullName)) {
    contactUpdate.fullName = person.fullName;
  }
  if (apply && person?.title) {
    contactUpdate.title = person.title;
  }

  if (person) {
    nextMeta.namedBuyer = {
      ...namedBuyer,
      fullName: person.fullName || buyerName,
      title:
        person.title ||
        (typeof namedBuyer.title === "string" ? namedBuyer.title : undefined) ||
        null,
      email: person.email || (typeof namedBuyer.email === "string" ? namedBuyer.email : null),
      emailStatus:
        person.emailStatus ||
        (typeof namedBuyer.emailStatus === "string" ? namedBuyer.emailStatus : null),
      linkedinUrl:
        person.linkedinUrl ||
        (typeof namedBuyer.linkedinUrl === "string" ? namedBuyer.linkedinUrl : null),
      source: "prospeo_enrich-person",
      verifiedAt: person.email ? now : namedBuyer.verifiedAt ?? null,
    };

    if (person.email) {
      const prior = Array.isArray(nextMeta.prospeoVerifiedEmails)
        ? [...nextMeta.prospeoVerifiedEmails]
        : [];
      const already = prior.some(
        (row) =>
          row &&
          typeof row === "object" &&
          !Array.isArray(row) &&
          String((row as Record<string, unknown>).email ?? "").toLowerCase() ===
            person.email!.toLowerCase(),
      );
      if (!already) {
        prior.unshift({
          email: person.email,
          fullName: person.fullName || buyerName,
          status: person.emailStatus,
          source: "prospeo_enrich-person",
          verifiedAt: now,
        });
      }
      nextMeta.prospeoVerifiedEmails = prior.slice(0, 20);
    }
  }

  const prospeo: ProspeoEnrichSnapshot = {
    enrichedAt: now,
    domain,
    person,
    personMatched,
    appliedEmail,
    notes,
  };
  nextMeta.prospeoEnrichment = prospeo;
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
  return { ok: true, prospeo, report };
}
