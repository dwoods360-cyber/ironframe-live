import "server-only";

import type { Prisma } from "@prisma/client";

import { normalizeAccountDomain } from "@/app/lib/ingress/ironleadsSuspectIdentity";
import { looksLikeOsintTitleNoise } from "@/app/lib/server/ironleadsBuyingCommitteeExtract";
import { isSalesDispatchHoldCompany } from "@/app/lib/approvalDispatchValidation";
import { emailMatchesAccountDomain } from "@/app/lib/server/ironleadsAccountResearchBrief";
import {
  enrichPersonWithHunter,
  isHunterConfigured,
  isHunterEmailPromoteReady,
  type HunterEnrichSnapshot,
} from "@/app/lib/server/hunterEnrichmentClient";
import { resolveSuspectLocationFields } from "@/app/lib/server/ironleadsSuspectLocation";
import { buildIronleadsSuspectReport } from "@/app/lib/server/ironleadsSuspectReportCore";
import prisma from "@/lib/prisma";

export type { HunterEnrichSnapshot };

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
 * HITL Hunter enrich for one SUSPECT — named buyer + domain → verified work email.
 * Applies email only when contact still has placeholder @ironleads.local AND
 * Hunter verification.status === "valid" on the employer domain.
 */
export async function enrichIronleadsSuspectWithHunter(
  contactId: string,
  options?: { applyContactFields?: boolean },
): Promise<
  | {
      ok: true;
      hunter: HunterEnrichSnapshot;
      report: NonNullable<Awaited<ReturnType<typeof buildIronleadsSuspectReport>>>;
    }
  | { ok: false; error: string; status: number }
> {
  if (!isHunterConfigured()) {
    return {
      ok: false,
      error:
        "HUNTER_API_KEY is not set. Add it in Vercel / .env.local (Hunter → API).",
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
    return { ok: false, error: "Only SUSPECT-stage contacts can use Hunter enrich", status: 400 };
  }
  if (looksLikeOsintTitleNoise(contact.company) || isSalesDispatchHoldCompany(contact.company)) {
    return {
      ok: false,
      error: "Skip Hunter on title-noise or HOLD/channel-competitor rows",
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
      error: "Need accountDomain or websiteUrl before Hunter enrich",
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
      error: "Set Named buyer full name (first + last) before Enrich with Hunter",
      status: 400,
    };
  }

  const nameParts = splitName(buyerName)!;
  const linkedinUrl = resolveLinkedinHint(meta, buyerName);
  const personResult = await enrichPersonWithHunter({
    domain,
    companyName: contact.company,
    linkedinUrl,
    firstName: nameParts.first,
    lastName: nameParts.last,
    fullName: buyerName,
  });

  if (!personResult.ok) {
    return { ok: false, error: personResult.error, status: personResult.status };
  }

  const person = personResult.person;
  const personMatched = personResult.matched;
  if (personMatched && person) {
    notes.push(
      `Person match for "${buyerName}" (Hunter status=${person.emailStatus ?? "n/a"}, score=${person.score ?? "n/a"})`,
    );
  } else {
    notes.push(`No person match for "${buyerName}" — verify name/domain or try LinkedIn URL`);
  }

  const apply = options?.applyContactFields !== false;
  let appliedEmail = false;
  const contactUpdate: Prisma.IronboardCrmContactUpdateInput = {};
  const nextMeta = { ...meta };
  const now = new Date().toISOString();

  const placeholderEmail = /@ironleads\.local$/i.test(contact.email);
  const verifiedOk = isHunterEmailPromoteReady(person?.emailStatus);
  const emailOk = Boolean(person?.email) && verifiedOk;
  const employerEmailOk =
    emailOk && emailMatchesAccountDomain(person?.email ?? null, domain);

  if (person?.email && !verifiedOk) {
    notes.push(
      `Hunter returned ${person.email} with status=${person.emailStatus ?? "unknown"} — Gatekeeper requires verification.status=valid before auto-apply`,
    );
  }
  if (person?.email && verifiedOk && !employerEmailOk) {
    notes.push(
      `Rejected Hunter email ${person.email} — not on employer domain ${domain}`,
    );
    nextMeta.hunterRejectedEmail = {
      at: now,
      email: person.email,
      titleReturned: person.title ?? null,
      domainExpected: domain,
      reason: "wrong_employer_domain",
      source: "hunter_email-finder",
    };
  }

  if (apply && person?.email && employerEmailOk && placeholderEmail) {
    contactUpdate.email = person.email.toLowerCase();
    appliedEmail = true;
    notes.push(`Applied work email ${person.email}`);
  } else if (person?.email && employerEmailOk && !placeholderEmail) {
    notes.push("Contact already has a non-placeholder email — left unchanged");
  }

  if (apply && person?.fullName && /ironleads|prospect|suspect/i.test(contact.fullName)) {
    contactUpdate.fullName = person.fullName;
  }
  if (apply && person?.title && employerEmailOk) {
    contactUpdate.title = person.title;
  }

  if (person) {
    const priorBuyerEmail =
      typeof namedBuyer.email === "string" ? namedBuyer.email : null;
    const keepPriorEmployerEmail =
      priorBuyerEmail && emailMatchesAccountDomain(priorBuyerEmail, domain)
        ? priorBuyerEmail
        : null;
    nextMeta.namedBuyer = {
      ...namedBuyer,
      fullName: person.fullName || buyerName,
      title: employerEmailOk
        ? person.title ||
          (typeof namedBuyer.title === "string" ? namedBuyer.title : undefined) ||
          null
        : (typeof namedBuyer.title === "string" ? namedBuyer.title : null) ||
          contact.title ||
          null,
      email: employerEmailOk
        ? person.email
        : keepPriorEmployerEmail,
      emailStatus: employerEmailOk
        ? person.emailStatus ||
          (typeof namedBuyer.emailStatus === "string" ? namedBuyer.emailStatus : null)
        : keepPriorEmployerEmail
          ? (typeof namedBuyer.emailStatus === "string" ? namedBuyer.emailStatus : null)
          : person.emailStatus || "rejected_not_valid",
      linkedinUrl:
        person.linkedinUrl ||
        (typeof namedBuyer.linkedinUrl === "string" ? namedBuyer.linkedinUrl : null),
      source: "hunter_email-finder",
      verifiedAt: employerEmailOk && person.email ? now : namedBuyer.verifiedAt ?? null,
      hunterScore: person.score,
      ...(employerEmailOk
        ? {}
        : {
            rejectedEnrichment: {
              at: now,
              email: person.email,
              titleReturned: person.title ?? null,
              verdict: verifiedOk
                ? "REJECTED_WRONG_EMPLOYER_DOMAIN"
                : "REJECTED_HUNTER_NOT_VALID",
              domainExpected: domain,
              hunterStatus: person.emailStatus,
            },
          }),
    };

    if (person.email && employerEmailOk) {
      const prior = Array.isArray(nextMeta.hunterVerifiedEmails)
        ? [...nextMeta.hunterVerifiedEmails]
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
          score: person.score,
          source: "hunter_email-finder",
          verifiedAt: now,
        });
      }
      nextMeta.hunterVerifiedEmails = prior.slice(0, 20);
    }
  }

  const hunter: HunterEnrichSnapshot = {
    enrichedAt: now,
    domain,
    person,
    personMatched,
    appliedEmail,
    notes,
  };
  nextMeta.hunterEnrichment = hunter;
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
  return { ok: true, hunter, report };
}
