import "server-only";

import type { Prisma } from "@prisma/client";

import {
  buildAccountResearchBrief,
  mergeNamedBuyerIntoBriefMembers,
  resolveAccountResearchBrief,
  selectAccountResearchBriefForReport,
  type AccountResearchBrief,
} from "@/app/lib/server/ironleadsAccountResearchBrief";
import { looksLikeOsintTitleNoise } from "@/app/lib/server/ironleadsBuyingCommitteeExtract";
import {
  formatIronleadsDealNotes,
  formatQualificationSignalsDisplay,
  type QualificationSignalsDisplay,
} from "@/app/lib/ironleadsOperatorDisplay";
import type { ApolloEnrichSnapshot } from "@/app/lib/server/apolloEnrichmentClient";
import type { ProspeoEnrichSnapshot } from "@/app/lib/server/prospeoEnrichmentClient";
import {
  resolveOperatorHold,
  type OperatorHoldRecord,
} from "@/app/lib/server/ironleadsOperatorHoldCore";
import { normalizeAccountDomain } from "@/app/lib/ingress/ironleadsSuspectIdentity";
import {
  resolveSuspectLocationFields,
  websiteUrlFromDomainOrUrl,
  type SuspectBuyingCommittee,
  type SuspectCandidateEmail,
  type SuspectExecutiveSponsor,
  type SuspectNamedBuyer,
  type SuspectPostalAddress,
  type SuspectWebsiteContact,
} from "@/app/lib/server/ironleadsSuspectLocation";
import {
  buildDomainMailFootprint,
  resolveFootprintDomain,
  type DomainMailFootprint,
} from "@/app/lib/server/domainMailFootprint";
import prisma from "@/lib/prisma";

export { looksLikeOsintTitleNoise };
export type { DomainMailFootprint };

/** Matches Ironleads sector routing default for design-partner outreach. */
const PROSPECT_POOL_TENANT_SLUG = "prospect-pool";

export type SuspectReportBlocker = {
  code:
    | "STAGE_SUSPECT"
    | "PLACEHOLDER_EMAIL"
    | "NO_PHONE"
    | "NOT_PROSPECT_POOL"
    | "MISSING_DOMAIN"
    | "OSINT_TITLE_NOISE";
  title: string;
  detail: string;
};

export type IronleadsSuspectReport = {
  contactId: string;
  company: string;
  fullName: string;
  email: string;
  phone: string | null;
  websiteUrl: string | null;
  address: SuspectPostalAddress | null;
  addressLine: string | null;
  websiteContact: SuspectWebsiteContact | null;
  namedBuyer: SuspectNamedBuyer | null;
  executiveSponsor: SuspectExecutiveSponsor | null;
  candidateEmails: SuspectCandidateEmail[];
  buyingCommittee: SuspectBuyingCommittee | null;
  /** Qualification + outreach decision brief (LinkedIn/YT are evidence, not the deliverable). */
  accountResearchBrief: AccountResearchBrief | null;
  /** Operator HITL HOLD archive — parked for later retrieval (not Path B cold). */
  operatorHold: OperatorHoldRecord | null;
  /** Last Apollo.org/people enrich snapshot (HITL; credits consumed on Apollo side). */
  apolloEnrichment: ApolloEnrichSnapshot | null;
  /** Last Prospeo enrich-person snapshot (HITL; credits consumed on Prospeo side). */
  prospeoEnrichment: ProspeoEnrichSnapshot | null;
  /**
   * Public DNS mail footprint (MX / SPF / DMARC / provider guess).
   * Decision aid only — not mailbox ownership proof.
   */
  mailFootprint: DomainMailFootprint | null;
  tenantSlug: string;
  industrySector: string | null;
  detectedTrigger: string | null;
  priorityScore: number;
  ingestionSource: string;
  qualificationSignals: unknown;
  createdAt: string;
  updatedAt: string;
  deal: {
    id: string;
    stage: string;
    title: string;
    accountDomain: string | null;
    notes: string;
    updatedAt: string;
  } | null;
  channelReadiness: {
    hasRealEmail: boolean;
    hasPhone: boolean;
    reachable: boolean;
  };
  whyInSuspectQueue: string;
  whyNotProspectQueue: string;
  blockers: SuspectReportBlocker[];
  nextActions: string[];
  /** Plain-language deal notes for the report UI. */
  dealNotesDisplay: string[];
  /** Plain-language qualification signals for the report UI. */
  qualificationDisplay: QualificationSignalsDisplay | null;
};

const IRONLEADS_LOCAL_EMAIL = /@ironleads\.local$/i;

export function buildSuspectHoldBlockers(input: {
  company: string;
  email: string;
  phone: string | null;
  tenantSlug: string;
  accountDomain: string | null;
  /** metadata.websiteUrl — counts toward domain readiness when deal.accountDomain is empty */
  websiteUrl?: string | null;
  stage: string | null;
}): SuspectReportBlocker[] {
  const blockers: SuspectReportBlocker[] = [];
  const hasRealEmail = Boolean(input.email) && !IRONLEADS_LOCAL_EMAIL.test(input.email);
  const hasPhone = Boolean(input.phone?.trim());
  const resolvedDomain =
    normalizeAccountDomain(input.accountDomain) ||
    normalizeAccountDomain(websiteUrlFromDomainOrUrl(input.websiteUrl) ?? input.websiteUrl);

  if (!input.stage || input.stage === "SUSPECT") {
    blockers.push({
      code: "STAGE_SUSPECT",
      title: "Deal stage is still SUSPECT",
      detail:
        "Ironleads ingress always creates SUSPECT deals. SalesTeam only polls PROSPECT-stage deals, so this row cannot enter the PROSPECT outreach queue until an operator promotes it after enrichment.",
    });
  }

  if (!hasRealEmail) {
    blockers.push({
      code: "PLACEHOLDER_EMAIL",
      title: "No real buyer email",
      detail: input.email
        ? `Email is a harvest placeholder (${input.email}). EMAIL DISPATCH is blocked until a client-owned inbox is set.`
        : "No email on file. EMAIL DISPATCH requires a real buyer or switchboard inbox.",
    });
  }

  if (!hasPhone) {
    blockers.push({
      code: "NO_PHONE",
      title: "No phone number",
      detail:
        "SMS DISPATCH requires a reachable public or buyer phone. Enrich with a switchboard number before promoting.",
    });
  }

  if (input.tenantSlug !== PROSPECT_POOL_TENANT_SLUG) {
    blockers.push({
      code: "NOT_PROSPECT_POOL",
      title: `Parked on demo tenant “${input.tenantSlug}”`,
      detail:
        "Sector routing sent this lead to a beachhead demo tenant (vaultbank / medshield / gridcore). Design-partner SalesTeam poll targets prospect-pool PROSPECTs — not these demo SUSPECT rows — until you enrich and move/promote intentionally.",
    });
  }

  if (!resolvedDomain) {
    blockers.push({
      code: "MISSING_DOMAIN",
      title: "Missing account domain",
      detail:
        "No deal.accountDomain and no website URL to derive one. Domain helps dedupe and confirms the company is a real outbound target.",
    });
  }

  if (looksLikeOsintTitleNoise(input.company)) {
    blockers.push({
      code: "OSINT_TITLE_NOISE",
      title: "Company name looks like OSINT title noise",
      detail:
        "The stored company string resembles an article headline, agency page, or role title rather than a buyer account. Prefer dropping or re-harvesting against a named firm before promotion.",
    });
  }

  return blockers;
}

export async function buildIronleadsSuspectReport(
  contactId: string,
): Promise<IronleadsSuspectReport | null> {
  const id = contactId.trim();
  if (!id) return null;

  const contact = await prisma.ironboardCrmContact.findUnique({
    where: { id },
    select: {
      id: true,
      fullName: true,
      email: true,
      company: true,
      title: true,
      phone: true,
      metadata: true,
      industrySector: true,
      detectedTrigger: true,
      priorityScore: true,
      ingestionSource: true,
      qualificationSignals: true,
      createdAt: true,
      updatedAt: true,
      tenant: { select: { slug: true } },
      primaryDeals: {
        orderBy: { updatedAt: "desc" },
        take: 1,
        select: {
          id: true,
          stage: true,
          title: true,
          accountDomain: true,
          notes: true,
          updatedAt: true,
        },
      },
    },
  });

  if (!contact) return null;

  const deal = contact.primaryDeals[0] ?? null;
  const location = resolveSuspectLocationFields({
    metadata: contact.metadata,
    accountDomain: deal?.accountDomain ?? null,
  });
  const hasRealEmail =
    Boolean(contact.email) && !IRONLEADS_LOCAL_EMAIL.test(contact.email);
  const hasPhone = Boolean(contact.phone?.trim());
  const reachable = hasRealEmail || hasPhone;

  const blockers = buildSuspectHoldBlockers({
    company: contact.company,
    email: contact.email,
    phone: contact.phone,
    tenantSlug: contact.tenant.slug,
    accountDomain: deal?.accountDomain ?? null,
    websiteUrl: location.websiteUrl,
    stage: deal?.stage ?? null,
  });

  const nextActions: string[] = [];
  if (blockers.some((b) => b.code === "OSINT_TITLE_NOISE")) {
    nextActions.push("Confirm this is a real buyer company; drop if it is OSINT title noise.");
  }
  if (!hasPhone) {
    nextActions.push("Enrich a public switchboard or buyer phone for SMS.");
  }
  if (!hasRealEmail) {
    nextActions.push(
      "Replace @ironleads.local with a real buyer email (Enrich with Apollo or Prospeo after Named buyer is set, or paste manually).",
    );
  }
  if (!location.websiteUrl) {
    nextActions.push("Add company website URL (metadata.websiteUrl or deal accountDomain).");
  }
  if (!location.addressLine) {
    nextActions.push("Add brick-and-mortar HQ address in metadata.address when publicly known.");
  }
  if (!location.namedBuyer) {
    nextActions.push("Attach a named buyer (CISO / GRC lead) when a public appointment or job signal confirms one.");
  } else if (!hasRealEmail) {
    nextActions.push(
      `Named buyer ${location.namedBuyer.fullName} is on file — obtain a client-owned email or DISPATCH SMS to the seeded switchboard.`,
    );
  }
  if (blockers.some((b) => b.code === "NOT_PROSPECT_POOL")) {
    nextActions.push(
      "After enrichment, place a reachable PROSPECT on prospect-pool (or intentionally work this beachhead tenant).",
    );
  }
  if (deal?.stage === "SUSPECT" && reachable) {
    nextActions.push(
      "Promote the deal stage SUSPECT → PROSPECT so SalesTeam poll can draft outreach.",
    );
  }
  if (deal?.stage === "PROSPECT" && reachable) {
    nextActions.push("Run SalesTeam poll and edit/DISPATCH the draft in Approvals.");
  }
  if (nextActions.length === 0) {
    nextActions.push("Review trigger and qualification signals, then decide enrich vs drop.");
  }

  // Prefer the brief persisted by buying-committee research (real page corpus).
  // Rebuild only when missing — empty corpus here previously forced Fit UNKNOWN
  // even when websiteUrl was already on the contact.
  const persistedBrief = resolveAccountResearchBrief(contact.metadata);
  const briefMembers = mergeNamedBuyerIntoBriefMembers({
    members: location.buyingCommittee?.members ?? [],
    namedBuyer: location.namedBuyer
      ? {
          fullName: location.namedBuyer.fullName,
          title: location.namedBuyer.title,
          role: location.namedBuyer.role,
          email: location.namedBuyer.email,
          emailStatus: location.namedBuyer.emailStatus,
          linkedinUrl: location.namedBuyer.linkedinUrl,
          sourceUrls: location.namedBuyer.sourceUrls,
          note: location.namedBuyer.note,
        }
      : null,
    contactEmail: hasRealEmail ? contact.email : null,
    contactTitle: contact.title,
  });
  const reportCorpus = [
    contact.company,
    contact.industrySector,
    location.websiteUrl,
    contact.detectedTrigger,
    contact.title,
    location.namedBuyer?.fullName,
    location.namedBuyer?.title,
    location.namedBuyer?.role,
    // Boutique founder/vCISO sites often lack a scraped committee; seed Fit from sector + buyer title.
    /mssp|vciso|grc|compliance|cyber/i.test(
      `${contact.industrySector ?? ""} ${location.namedBuyer?.title ?? ""} ${contact.title ?? ""}`,
    )
      ? "MSSP vCISO compliance advisory cybersecurity"
      : null,
    ...briefMembers.flatMap((m) =>
      [m.fullName, m.title, m.note, ...m.emails.map((e) => e.email)].filter(Boolean),
    ),
    ...(location.candidateEmails.map((e) => `${e.person} ${e.email}`) ?? []),
  ]
    .filter(Boolean)
    .join("\n");
  const operatorHold = resolveOperatorHold(contact.metadata);
  const pathBHold =
    operatorHold?.classification === "channel_competitor" ||
    operatorHold?.classification === "hold";
  const rebuiltBrief = buildAccountResearchBrief({
    company: contact.company,
    websiteUrl: location.websiteUrl,
    detectedTrigger: contact.detectedTrigger,
    industrySector: contact.industrySector,
    dealStage: deal?.stage ?? null,
    corpus: reportCorpus,
    sourceUrls: [
      ...(location.namedBuyer?.sourceUrls ?? []),
      ...(location.namedBuyer?.linkedinUrl ? [location.namedBuyer.linkedinUrl] : []),
      ...(location.buyingCommittee?.members.flatMap((m) => m.sourceUrls) ?? []),
      ...(location.buyingCommittee?.socialProfiles.map((s) => s.url) ?? []),
    ],
    members: briefMembers,
    socialProfiles: location.buyingCommittee?.socialProfiles ?? [],
    hasRealEmail,
    contactEmail: hasRealEmail ? contact.email : null,
    pathBHold,
    hasPhone,
    generatedAt: new Date().toISOString(),
  });
  const briefSelection = selectAccountResearchBriefForReport(persistedBrief, rebuiltBrief);
  const accountResearchBrief = briefSelection.brief;
  const metaRecord =
    contact.metadata &&
    typeof contact.metadata === "object" &&
    !Array.isArray(contact.metadata)
      ? (contact.metadata as Record<string, unknown>)
      : null;

  // Persist gate/roster upgrades only — never clobber rich scrape findings with a thin
  // report-corpus rebuild when Email is still company-intake UNKNOWN.
  if (briefSelection.shouldPersist) {
    const fresh = await prisma.ironboardCrmContact.findUnique({
      where: { id: contact.id },
      select: { metadata: true },
    });
    const freshMeta =
      fresh?.metadata &&
      typeof fresh.metadata === "object" &&
      !Array.isArray(fresh.metadata)
        ? (fresh.metadata as Record<string, unknown>)
        : (metaRecord ?? {});
    await prisma.ironboardCrmContact
      .update({
        where: { id: contact.id },
        data: {
          metadata: {
            ...freshMeta,
            accountResearchBrief: briefSelection.brief,
          } as Prisma.InputJsonValue,
        },
      })
      .catch(() => undefined);
  }
  const apolloRaw = metaRecord?.apolloEnrichment ?? null;
  const apolloEnrichment =
    apolloRaw && typeof apolloRaw === "object" && !Array.isArray(apolloRaw)
      ? (apolloRaw as ApolloEnrichSnapshot)
      : null;
  const prospeoRaw = metaRecord?.prospeoEnrichment ?? null;
  const prospeoEnrichment =
    prospeoRaw && typeof prospeoRaw === "object" && !Array.isArray(prospeoRaw)
      ? (prospeoRaw as ProspeoEnrichSnapshot)
      : null;

  const footprintDomain = resolveFootprintDomain({
    accountDomain: deal?.accountDomain ?? null,
    websiteUrl: location.websiteUrl,
    contactEmail: hasRealEmail ? contact.email : null,
  });
  let mailFootprint: DomainMailFootprint | null = null;
  if (footprintDomain) {
    try {
      mailFootprint = await buildDomainMailFootprint(footprintDomain);
    } catch {
      mailFootprint = null;
    }
  }
  if (mailFootprint?.catchAllRisk === "high") {
    nextActions.unshift(
      `Mail footprint: ${mailFootprint.providerLabel} — high catch-all/gateway risk. Do not Promote on pattern_guess MX PASS alone.`,
    );
  } else if (mailFootprint?.mxOk === false) {
    nextActions.unshift(
      "Mail footprint: no MX for this domain — pattern-guess emails are unlikely to route.",
    );
  }

  if (operatorHold) {
    nextActions.unshift(
      `HOLD archive (${operatorHold.classification}) — parked ${operatorHold.at}. Restore from archive before Promote. Reason: ${operatorHold.reason}`,
    );
  } else if (accountResearchBrief.outreach.status === "hold") {
    nextActions.unshift(
      "Account Research Brief: HOLD — move to HOLD archive after review (do not Promote for Path B cold).",
    );
  } else if (accountResearchBrief.outreach.status === "drop") {
    nextActions.unshift("Account Research Brief: DROP — remove from Path B shortlist.");
  } else if (accountResearchBrief.outreach.status === "promote" && deal?.stage === "SUSPECT") {
    nextActions.unshift(
      "Account Research Brief: gates support Promote — confirm email, then SUSPECT→PROSPECT.",
    );
  }

  return {
    contactId: contact.id,
    company: contact.company,
    fullName: contact.fullName,
    email: contact.email,
    phone: contact.phone,
    websiteUrl: location.websiteUrl,
    address: location.address,
    addressLine: location.addressLine,
    websiteContact: location.websiteContact,
    namedBuyer: location.namedBuyer,
    executiveSponsor: location.executiveSponsor,
    candidateEmails: location.candidateEmails,
    buyingCommittee: location.buyingCommittee,
    accountResearchBrief,
    operatorHold,
    apolloEnrichment,
    prospeoEnrichment,
    mailFootprint,
    tenantSlug: contact.tenant.slug,
    industrySector: contact.industrySector,
    detectedTrigger: contact.detectedTrigger,
    priorityScore: contact.priorityScore,
    ingestionSource: contact.ingestionSource,
    qualificationSignals: contact.qualificationSignals,
    createdAt: contact.createdAt.toISOString(),
    updatedAt: contact.updatedAt.toISOString(),
    deal: deal
      ? {
          id: deal.id,
          stage: deal.stage,
          title: deal.title,
          accountDomain: deal.accountDomain,
          notes: deal.notes,
          updatedAt: deal.updatedAt.toISOString(),
        }
      : null,
    channelReadiness: { hasRealEmail, hasPhone, reachable },
    whyInSuspectQueue:
      deal?.stage === "PROSPECT"
        ? "This lead entered via Ironleads SUSPECT intake and has already been promoted to PROSPECT. It no longer waits in the active SUSPECT review queue for promote."
        : "Ironleads ships every qualified OSINT hit into CRM as SUSPECT so operators can review trigger fit before outreach. This contact still has an open SUSPECT-stage deal.",
    whyNotProspectQueue:
      deal?.stage === "PROSPECT"
        ? "This deal is already PROSPECT. Next phase is SalesTeam poll → edit/DISPATCH the draft in Approvals (not another Ironleads promote)."
        : reachable
          ? "Contact path exists, but the deal has not been promoted to PROSPECT (or is outside prospect-pool), so SalesTeam will not draft Approvals outreach yet."
          : "No reachable EMAIL or SMS path yet (real inbox and/or phone). Without that enrichment, the lead stays in the SUSPECT review queue and is excluded from design-partner PROSPECT dispatch.",
    blockers,
    nextActions,
    dealNotesDisplay: formatIronleadsDealNotes(deal?.notes),
    qualificationDisplay: formatQualificationSignalsDisplay(contact.qualificationSignals),
  };
}
