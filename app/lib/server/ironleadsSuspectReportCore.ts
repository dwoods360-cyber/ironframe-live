import "server-only";

import { looksLikeOsintTitleNoise } from "@/app/lib/server/ironleadsBuyingCommitteeExtract";
import {
  resolveSuspectLocationFields,
  type SuspectBuyingCommittee,
  type SuspectCandidateEmail,
  type SuspectExecutiveSponsor,
  type SuspectNamedBuyer,
  type SuspectPostalAddress,
  type SuspectWebsiteContact,
} from "@/app/lib/server/ironleadsSuspectLocation";
import prisma from "@/lib/prisma";

export { looksLikeOsintTitleNoise };

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
};

const IRONLEADS_LOCAL_EMAIL = /@ironleads\.local$/i;

export function buildSuspectHoldBlockers(input: {
  company: string;
  email: string;
  phone: string | null;
  tenantSlug: string;
  accountDomain: string | null;
  stage: string | null;
}): SuspectReportBlocker[] {
  const blockers: SuspectReportBlocker[] = [];
  const hasRealEmail = Boolean(input.email) && !IRONLEADS_LOCAL_EMAIL.test(input.email);
  const hasPhone = Boolean(input.phone?.trim());

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

  if (!input.accountDomain?.trim()) {
    blockers.push({
      code: "MISSING_DOMAIN",
      title: "Missing account domain",
      detail:
        "No normalized account domain on the deal. Domain helps dedupe and confirms the company is a real outbound target.",
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
    nextActions.push("Replace @ironleads.local with a real buyer or info@ inbox for EMAIL.");
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
      "Ironleads ships every qualified OSINT hit into CRM as SUSPECT so operators can review trigger fit before outreach. This contact still has an open SUSPECT-stage deal.",
    whyNotProspectQueue: reachable
      ? "Contact path exists, but the deal has not been promoted to PROSPECT (or is outside prospect-pool), so SalesTeam will not draft Approvals outreach yet."
      : "No reachable EMAIL or SMS path yet (real inbox and/or phone). Without that enrichment, the lead stays in the SUSPECT review queue and is excluded from design-partner PROSPECT dispatch.",
    blockers,
    nextActions,
  };
}
