/**
 * Account Research Brief — operator qualification + outreach decision.
 * LinkedIn / YouTube / Facebook are evidence sources inside the brief, not the deliverable.
 */

import { isSalesDispatchHoldCompany } from "@/app/lib/approvalDispatchValidation";
import {
  isPlausiblePersonName,
  type PublicSocialLink,
} from "@/app/lib/server/ironleadsBuyingCommitteeExtract";

export type GateResult = "PASS" | "FAIL" | "UNKNOWN";

export type BriefAccountStatus = "SUSPECT" | "HOLD" | "APPROVED" | "DROP";

export type BriefRelationshipClass =
  | "direct_design_partner"
  | "channel_candidate"
  | "integration_candidate"
  | "research_relationship"
  | "competitor"
  | "hold"
  | "drop";

export type BriefOutreachStatus = "keep_suspect" | "promote" | "hold" | "drop";

export type BriefPurchaseRole =
  | "economic_buyer"
  | "operational_buyer"
  | "influencer"
  | "gatekeeper";

export type AccountResearchBriefGate = {
  finding: string;
  result: GateResult;
  why: string;
};

export type AccountResearchBriefBuyer = {
  name: string | null;
  title: string | null;
  purchaseRole: BriefPurchaseRole;
  whyOwnsWorkflow: string;
  linkedInUrl: string | null;
  biographyUrl: string | null;
  email: string | null;
  emailStatus: string | null;
  phone: string | null;
  confidence: "high" | "medium" | "low";
};

export type AccountResearchBriefSource = {
  title: string;
  url: string | null;
  accessedAt: string;
  excerpt: string;
  confidence: "verified" | "inference" | "hypothesis" | "outdated";
};

export type AccountResearchBrief = {
  generatedAt: string;
  /** How the operator should use this brief (read first). */
  howToUse: string;
  snapshot: {
    company: string;
    websiteUrl: string | null;
    employeeRange: string | null;
    practiceType: string | null;
    estimatedClientScale: string | null;
    relevantServices: string[];
    existingGrcProducts: string[];
    status: BriefAccountStatus;
  };
  gates: {
    fit: AccountResearchBriefGate;
    pain: AccountResearchBriefGate;
    /** Named economic/operational buyer from public pages or operator attach. */
    buyer: AccountResearchBriefGate;
    /**
     * Promote-ready buyer work inbox (published person mailto / operator / Apollo / Prospeo).
     * Company intakes (info@/hello@) stay UNKNOWN. Optional on legacy briefs.
     */
    email?: AccountResearchBriefGate;
  };
  buyerMap: AccountResearchBriefBuyer[];
  triggerEvidence: Array<{
    kind: string;
    source: string | null;
    date: string | null;
    finding: string;
    whyItMatters: string;
  }>;
  /** Stub for Phase 3 — URLs + operator prompts, not page dumps. */
  linkedInIntelligence: {
    urls: string[];
    operatorPrompt: string;
    extractedFacts: string[];
  };
  youtubeIntelligence: {
    urls: string[];
    operatorPrompt: string;
    extractedClips: Array<{
      timestamp: string;
      finding: string;
      ironframeRelevance: string;
      confidence: "high" | "medium" | "low";
    }>;
  };
  competitiveConflict: {
    proprietaryPlatform: string | null;
    preferredPartners: string[];
    classification: BriefRelationshipClass;
    finding: string;
    relationshipNote: string;
  };
  outreach: {
    status: BriefOutreachStatus;
    bestWedge: string;
    bestChannel: string;
    primaryBuyer: string | null;
    secondaryBuyer: string | null;
    personalizationFact: string;
    /** Why this message / channel / timing. */
    whyThisApproach: string;
    /** Concrete talk track for the operator. */
    whatToSay: string;
    questionToAsk: string;
    claimsToAvoid: string[];
    /** How to act on this outreach block today. */
    howToUse: string;
  };
  sourceLedger: AccountResearchBriefSource[];
};

/** Role/company intakes — reachable, but not Email-gate PASS for Path B Promote. */
const GENERIC_COMPANY_INBOX_LOCALS = new Set([
  "info",
  "hello",
  "hi",
  "sales",
  "support",
  "contact",
  "admin",
  "office",
  "team",
  "privacy",
  "customerservice",
  "customer.service",
  "customer-service",
  "enquiries",
  "enquiry",
  "inquiry",
  "inquiries",
  "help",
  "noreply",
  "no-reply",
  "donotreply",
  "do-not-reply",
  "marketing",
  "press",
  "media",
  "hr",
  "jobs",
  "careers",
  "billing",
  "accounts",
  "webmaster",
  "postmaster",
  "abuse",
  "security",
  "compliance",
]);

/**
 * True when the address looks like a person/work seat (not info@/hello@ switchboard).
 * Placeholder @ironleads.local never qualifies.
 */
export function isPromoteReadyWorkEmail(email: string | null | undefined): boolean {
  const raw = (email ?? "").trim().toLowerCase();
  if (!raw || !raw.includes("@")) return false;
  if (/@ironleads\.local$/i.test(raw)) return false;
  const local = raw.split("@")[0] ?? "";
  if (!local) return false;
  const base = local.split("+")[0] ?? local;
  if (GENERIC_COMPANY_INBOX_LOCALS.has(base)) return false;
  // Single-token role aliases like "info.us"
  const roleRoot = base.split(/[._-]/)[0] ?? base;
  if (GENERIC_COMPANY_INBOX_LOCALS.has(roleRoot) && base !== roleRoot) return false;
  return true;
}

export type BuildAccountResearchBriefInput = {
  company: string;
  websiteUrl: string | null;
  detectedTrigger: string | null;
  industrySector: string | null;
  dealStage: string | null;
  corpus: string;
  sourceUrls: string[];
  members: Array<{
    role: string;
    fullName: string | null;
    title: string | null;
    emails: Array<{
      email: string;
      status: string;
      source: string | null;
      mailboxCheck?: { label?: string; ok?: boolean; reason?: string } | null;
    }>;
    phones: Array<{ phone: string; kind: string; status: string; source: string | null }>;
    sourceUrls: string[];
    note: string | null;
  }>;
  socialProfiles: PublicSocialLink[] | Array<{
    network: string;
    url: string;
    kind?: string;
    fetchable?: boolean;
    note?: string | null;
  }>;
  /** Any non-placeholder inbox (channel reachability). */
  hasRealEmail: boolean;
  /**
   * Optional contact.email — used with member emails to decide Email-gate PASS.
   * Company intakes (info@/hello@) keep Email UNKNOWN even when hasRealEmail is true.
   */
  contactEmail?: string | null;
  /**
   * Operator HOLD archive / channel_competitor — forces Path B FAIL/HOLD even when
   * the company is not on the static SALES_DISPATCH_HOLD_COMPANIES list.
   */
  pathBHold?: boolean;
  hasPhone: boolean;
  generatedAt?: string;
};

export type BriefCommitteeMemberInput = BuildAccountResearchBriefInput["members"][number];

/**
 * Buyer gate historically only counted buyingCommittee scrape members.
 * Operator / Prospeo namedBuyer must also count — otherwise boutique founders
 * with verified email show Buyer FAIL despite a clear economic buyer on file.
 */
export function mergeNamedBuyerIntoBriefMembers(input: {
  members: BriefCommitteeMemberInput[];
  namedBuyer: {
    fullName: string;
    title?: string | null;
    role?: string | null;
    email?: string | null;
    emailStatus?: string | null;
    linkedinUrl?: string | null;
    sourceUrls?: string[];
    note?: string | null;
  } | null;
  /** Contact-level email when namedBuyer.email is absent. */
  contactEmail?: string | null;
  contactTitle?: string | null;
}): BriefCommitteeMemberInput[] {
  const members = [...input.members];
  const buyer = input.namedBuyer;
  if (!buyer?.fullName?.trim()) return members;
  // Do not let scrape/product UI junk ("Scorecard Free") inflate the Buyer gate.
  if (!isPlausiblePersonName(buyer.fullName)) return members;

  const nameKey = buyer.fullName.trim().toLowerCase();
  const email =
    (buyer.email?.trim() || input.contactEmail?.trim() || "").toLowerCase() || null;
  const emailStatus = buyer.emailStatus?.trim() || (email ? "operator_verified" : null);
  const role =
    buyer.role?.trim() ||
    inferBriefRoleFromTitle(buyer.title || input.contactTitle) ||
    "FOUNDER";
  const sourceUrls = [
    ...(buyer.sourceUrls ?? []),
    ...(buyer.linkedinUrl ? [buyer.linkedinUrl] : []),
  ].filter(Boolean);
  const note =
    buyer.note?.trim() ||
    "Named buyer on contact metadata (operator / Prospeo) — not scrape-only.";

  const existingIdx = members.findIndex(
    (m) => m.fullName?.trim().toLowerCase() === nameKey,
  );
  if (existingIdx >= 0) {
    const existing = members[existingIdx]!;
    const hasEmail = existing.emails.some(
      (e) => e.email?.trim().toLowerCase() === email,
    );
    members[existingIdx] = {
      ...existing,
      title: existing.title || buyer.title?.trim() || input.contactTitle?.trim() || null,
      role: existing.role || role,
      emails:
        email && !hasEmail
          ? [
              {
                email,
                status: emailStatus || "operator_verified",
                source: "namedBuyer",
              },
              ...existing.emails,
            ]
          : existing.emails,
      sourceUrls: [...new Set([...(existing.sourceUrls ?? []), ...sourceUrls])],
      note: existing.note || note,
    };
    return members;
  }

  members.unshift({
    role,
    fullName: buyer.fullName.trim(),
    title: buyer.title?.trim() || input.contactTitle?.trim() || null,
    emails: email
      ? [
          {
            email,
            status: emailStatus || "operator_verified",
            source: "namedBuyer",
          },
        ]
      : [],
    phones: [],
    sourceUrls,
    note,
  });
  return members;
}

function inferBriefRoleFromTitle(title: string | null | undefined): string | null {
  const t = (title || "").toLowerCase();
  if (!t) return null;
  if (/\bfounder\b|\bprincipal\b|\bowner\b/.test(t)) return "FOUNDER";
  if (/\bceo\b|chief executive/.test(t)) return "CEO";
  if (/\bcfo\b|chief financial/.test(t)) return "CFO";
  if (/\bciso\b|chief information security|chief infosec/.test(t)) return "CISO";
  if (/\bmanaging director\b|\bmd\b/.test(t)) return "MANAGING_DIRECTOR";
  if (/\bgrc\b|compliance lead|practice lead/.test(t)) return "GRC_PRACTICE_LEAD";
  return null;
}

const GRC_PRODUCT_PATTERNS: Array<{ re: RegExp; name: string }> = [
  { re: /\boscar\b/i, name: "OSCAR" },
  { re: /\bradius\s*360\b|\bradius360\b/i, name: "Radius360" },
  { re: /\bdrata\b/i, name: "Drata" },
  { re: /\bvanta\b/i, name: "Vanta" },
  { re: /\bhyperproof\b/i, name: "Hyperproof" },
  { re: /\blogicgate\b/i, name: "LogicGate" },
  { re: /\b(?:rsa\s+)?archer\b/i, name: "RSA Archer" },
  { re: /\bservice\s*now\b|\bsnow\s+grc\b/i, name: "ServiceNow GRC" },
  { re: /\baustralian\s+cyber\b|\bessential\s+eight\b/i, name: "local GRC tooling" },
];

const SERVICE_PATTERNS: Array<{ re: RegExp; label: string }> = [
  { re: /\bmssp\b|managed\s+security\s+service/i, label: "MSSP" },
  { re: /\bvciso\b|virtual\s+ciso|fractional\s+ciso/i, label: "vCISO" },
  { re: /\bmanaged\s+grc\b|grc\s+as\s+a\s+service|compliance\s+as\s+a\s+service/i, label: "managed GRC" },
  { re: /\bpenetration\s+test|\bpentest\b|\bred\s+team/i, label: "offensive security" },
  { re: /\bsoc\b|security\s+operations/i, label: "SOC" },
  { re: /\bincident\s+response\b|\bir\s+retainer/i, label: "incident response" },
  { re: /\baudit\s+support|compliance\s+assessment|soc\s*2|iso\s*27001|cmmc|hipaa/i, label: "compliance advisory" },
];

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.map((v) => v.trim()).filter(Boolean))];
}

function detectProducts(corpus: string, company: string): string[] {
  const found: string[] = [];
  const hay = `${company}\n${corpus}`;
  for (const row of GRC_PRODUCT_PATTERNS) {
    if (row.re.test(hay)) found.push(row.name);
  }
  // Known HOLD accounts even when About pages omit product names.
  if (/pivot\s*point/i.test(company) && !found.includes("OSCAR")) {
    found.push("OSCAR");
  }
  if (/blueradius|blue\s*radius/i.test(company) && !found.includes("Radius360")) {
    found.push("Radius360");
  }
  return uniqueStrings(found);
}

function detectServices(corpus: string, company: string): string[] {
  const hay = `${company}\n${corpus}`;
  const found = SERVICE_PATTERNS.filter((row) => row.re.test(hay)).map((row) => row.label);
  return uniqueStrings(found);
}

function practiceTypeFromServices(services: string[], industry: string | null): string | null {
  if (services.includes("MSSP") || services.includes("managed GRC") || services.includes("vCISO")) {
    return "MSSP / managed security & GRC practice";
  }
  if (services.includes("compliance advisory")) {
    return "Compliance / advisory practice";
  }
  if (industry?.trim()) return industry.trim();
  return null;
}

function purchaseRoleForMemberRole(role: string): BriefPurchaseRole {
  const r = role.toUpperCase();
  if (
    r === "CEO" ||
    r === "CFO" ||
    r === "MANAGING_DIRECTOR" ||
    r === "FOUNDER" ||
    r === "OWNER" ||
    r === "PRINCIPAL" ||
    r === "PARTNER"
  ) {
    return "economic_buyer";
  }
  if (
    r === "CISO" ||
    r === "CRO" ||
    r === "CCO" ||
    r === "VP_COMPLIANCE" ||
    r === "GRC_PRACTICE_LEAD" ||
    r === "DIRECTOR_OPS"
  ) {
    return "operational_buyer";
  }
  if (r === "GC") return "gatekeeper";
  return "influencer";
}

function whyOwnsWorkflow(role: string, title: string | null): string {
  const r = role.toUpperCase();
  const titled = title?.trim() || role;
  switch (r) {
    case "CISO":
      return `${titled} typically owns security program design and tool selection for client or internal GRC workflows — the operational buyer for evidence and oversight platforms.`;
    case "GRC_PRACTICE_LEAD":
      return `${titled} runs the GRC/vCISO delivery line; they feel portfolio reporting and evidence reuse pain first.`;
    case "MANAGING_DIRECTOR":
      return `${titled} sets practice P&L and partner strategy; economic buyer for design-partner or channel motions.`;
    case "CEO":
      return `${titled} approves net-new platform spend and partnership posture; economic sponsor when the practice bets on a GRC stack.`;
    case "FOUNDER":
    case "OWNER":
    case "PRINCIPAL":
    case "PARTNER":
      return `${titled} owns practice P&L and tool selection in a boutique model — economic and operational buyer for Path B co-builder seats.`;
    case "CFO":
      return `${titled} controls budget and ROI framing for multi-tenant tooling; engage only after operational fit is clear.`;
    case "CRO":
    case "CCO":
    case "VP_COMPLIANCE":
      return `${titled} owns compliance outcomes and reporting to leadership — operational buyer for consolidated evidence views.`;
    case "DIRECTOR_OPS":
      return `${titled} owns delivery operations and utilization; cares about workflow friction across client programs.`;
    case "GC":
      return `${titled} may gate vendor contracts and data-processing terms; not the primary Path B opener.`;
    default:
      return `${titled} appears in public leadership signals; confirm they own budget or delivery before outreach.`;
  }
}

function socialByNetwork(
  profiles: BuildAccountResearchBriefInput["socialProfiles"],
  network: string,
): string[] {
  return uniqueStrings(
    profiles.filter((p) => p.network.toLowerCase() === network).map((p) => p.url),
  );
}

export function buildAccountResearchBrief(
  input: BuildAccountResearchBriefInput,
): AccountResearchBrief {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const corpus = input.corpus || "";
  const products = detectProducts(corpus, input.company);
  const services = detectServices(corpus, input.company);
  const hold = isSalesDispatchHoldCompany(input.company) || Boolean(input.pathBHold);
  const competingPlatform = products.find((p) => p === "OSCAR" || p === "Radius360") ?? null;
  const hasCompetingStack = Boolean(competingPlatform) || hold;

  const namedMembers = input.members.filter(
    (m) => m.fullName?.trim() && isPlausiblePersonName(m.fullName),
  );
  const hasNamedBuyer = namedMembers.length > 0;
  const memberPromoteReadyEmail = namedMembers.some((m) =>
    m.emails.some(
      (e) =>
        isPromoteReadyWorkEmail(e.email) &&
        e.status !== "pattern_guess" &&
        e.status !== "INVALID" &&
        e.status !== "unavailable",
    ),
  );
  const contactPromoteReady = isPromoteReadyWorkEmail(input.contactEmail);
  /** Email gate PASS — person/work seat, not company intake alone. */
  const hasPromoteReadyEmail = memberPromoteReadyEmail || contactPromoteReady;

  const fitHaystack = [
    input.company,
    input.industrySector,
    input.websiteUrl,
    corpus,
  ]
    .filter(Boolean)
    .join("\n");
  const fitPass =
    services.some((s) =>
      ["MSSP", "vCISO", "managed GRC", "compliance advisory"].includes(s),
    ) || /mssp|vciso|managed\s+grc|cybersecurity|managed\s+security/i.test(fitHaystack);

  const fit: AccountResearchBriefGate = fitPass
    ? {
        result: "PASS",
        finding: services.length
          ? `Public site signals: ${services.join(", ")}.`
          : "Company name / sector / website signals suggest a security or compliance practice.",
        why: "Path B design partners need a real MSSP, vCISO, or managed-GRC motion — not a one-off enterprise IT shop.",
      }
    : corpus.trim()
      ? {
          result: "UNKNOWN",
          finding: "Public pages fetched but MSSP/vCISO/managed-GRC language was not clearly detected.",
          why: "Operator should confirm practice type before Promote; Fit FAIL means Drop or research-only.",
        }
      : input.websiteUrl?.trim()
        ? {
            result: "UNKNOWN",
            finding:
              "Website is on file, but no fetched page text is loaded into this brief yet.",
            why: "Re-run Research only on Ironleads so Fit can read the public site — having a URL alone is not the corpus.",
          }
        : {
            result: "UNKNOWN",
            finding: "Insufficient public corpus to confirm practice type.",
            why: "Add website/domain and re-run research before Fit can Pass.",
          };

  const trigger = input.detectedTrigger?.trim() || null;
  const pain: AccountResearchBriefGate = trigger
    ? {
        result: hasCompetingStack ? "FAIL" : "PASS",
        finding: `Harvest trigger: ${trigger}.`,
        why: hasCompetingStack
          ? "A trigger exists, but proprietary GRC conflict overrides Path B cold pain timing — do not treat hiring/news as a green light."
          : "A concrete OSINT trigger makes outreach timely if Fit, Buyer, and Email also Pass.",
      }
    : {
        result: "UNKNOWN",
        finding: "No specific harvest trigger recorded on this contact.",
        why: "Without a trigger, outreach is colder; look for hiring, acquisitions, or public evidence/reporting pain before Promote.",
      };

  const buyer: AccountResearchBriefGate = hasNamedBuyer
    ? {
        result: hasCompetingStack ? "FAIL" : "PASS",
        finding: `Named public roles: ${namedMembers
          .map((m) => `${m.fullName} (${m.role})`)
          .slice(0, 4)
          .join("; ")}.`,
        why: hasCompetingStack
          ? "Buyer names do not unlock Path B while the account is HOLD/competitor."
          : "A plausible named role is on file — clear Email separately before Promote.",
      }
    : {
        result: "FAIL",
        finding: "No plausible named economic or operational buyer extracted from public pages.",
        why: "Do not Promote on title guesses or product/UI scrape junk; find a real person who owns GRC delivery or budget.",
      };

  const email: AccountResearchBriefGate = hasCompetingStack
    ? {
        result: "FAIL",
        finding: hasPromoteReadyEmail
          ? "A promote-ready buyer inbox is on file, but HOLD/competitor blocks Path B use of it."
          : input.hasRealEmail
            ? "Only a company intake inbox is on file; HOLD/competitor also blocks Path B."
            : "No real buyer inbox on file; HOLD/competitor also blocks Path B.",
        why: "Do not DISPATCH while the account is on the competitor/HOLD shortlist.",
      }
    : hasPromoteReadyEmail
      ? {
          result: "PASS",
          finding: "A promote-ready (non-placeholder, non-generic) work email is on file for outreach.",
          why: "Published person mailto, operator-pasted buyer inbox, Apollo, or Prospeo clears this gate — pattern_guess and info@/hello@ intakes alone do not.",
        }
      : {
          result: "UNKNOWN",
          finding: input.hasRealEmail
            ? hasNamedBuyer
              ? "Named buyer is on file, but only a company intake inbox (info@/hello@/sales@) — not a personal work seat."
              : "Only a company intake inbox is on file — not a personal work seat."
            : hasNamedBuyer
              ? "Named buyer is on file, but no real work email yet."
              : "No real work email on file.",
          why: "Enrich with Apollo/Prospeo or paste a verified buyer inbox. Company intakes and switchboard phones alone are not enough. Buyer PASS without Email keeps the account SUSPECT.",
        };

  let status: BriefAccountStatus = "SUSPECT";
  let classification: BriefRelationshipClass = "research_relationship";
  let outreachStatus: BriefOutreachStatus = "keep_suspect";

  if (hasCompetingStack) {
    status = "HOLD";
    classification = competingPlatform ? "competitor" : "hold";
    outreachStatus = "hold";
  } else if (
    fit.result === "PASS" &&
    pain.result === "PASS" &&
    buyer.result === "PASS" &&
    email.result === "PASS"
  ) {
    status = input.dealStage === "PROSPECT" ? "APPROVED" : "SUSPECT";
    classification = "direct_design_partner";
    outreachStatus = input.dealStage === "PROSPECT" ? "promote" : "promote";
  } else if (fit.result === "FAIL") {
    status = "DROP";
    classification = "drop";
    outreachStatus = "drop";
  }

  const buyerMap: AccountResearchBriefBuyer[] = namedMembers.slice(0, 8).map((m) => {
    const memberEmail = m.emails[0] ?? null;
    const phone = m.phones[0] ?? null;
    const bio = m.sourceUrls[0] ?? null;
    const confidence: AccountResearchBriefBuyer["confidence"] =
      memberEmail?.status === "published" || phone?.status === "published"
        ? "high"
        : m.fullName
          ? "medium"
          : "low";
    return {
      name: m.fullName,
      title: m.title,
      purchaseRole: purchaseRoleForMemberRole(m.role),
      whyOwnsWorkflow: whyOwnsWorkflow(m.role, m.title),
      linkedInUrl: null,
      biographyUrl: bio,
      email: memberEmail?.email ?? null,
      emailStatus: memberEmail
        ? [memberEmail.status, memberEmail.mailboxCheck?.label].filter(Boolean).join(" · ") ||
          memberEmail.status
        : null,
      phone: phone?.phone ?? null,
      confidence,
    };
  });

  const primary =
    buyerMap.find((b) => b.purchaseRole === "operational_buyer") ??
    buyerMap.find((b) => b.purchaseRole === "economic_buyer") ??
    buyerMap[0] ??
    null;
  const secondary =
    buyerMap.find((b) => b !== primary && b.purchaseRole === "economic_buyer") ??
    buyerMap.find((b) => b !== primary) ??
    null;

  const linkedInUrls = socialByNetwork(input.socialProfiles, "linkedin");
  const youtubeUrls = socialByNetwork(input.socialProfiles, "youtube");
  const facebookUrls = socialByNetwork(input.socialProfiles, "facebook");

  const triggerEvidence = trigger
    ? [
        {
          kind: trigger,
          source: "Ironleads harvest",
          date: null,
          finding: `Autonomous harvest classified this account under ${trigger}.`,
          whyItMatters: hasCompetingStack
            ? "Trigger is logged for the ledger, but HOLD/competitor status blocks Path B cold DISPATCH."
            : "Use this as the timeliness hook in outreach — tie Ironframe to the workflow problem behind the trigger, not the trigger label alone.",
        },
      ]
    : [];

  const proprietaryPlatform =
    competingPlatform ?? (products[0] ?? null);

  const competitiveFinding = hasCompetingStack
    ? proprietaryPlatform
      ? `${input.company} operates or is tied to proprietary GRC platform ${proprietaryPlatform}. Path B cold design-partner outreach would compete with their own stack.`
      : `${input.company} is on the Path B HOLD list (channel/competitor shortlist).`
    : products.length
      ? `Public mentions of GRC tooling: ${products.join(", ")}. Assess replace vs integrate vs complement before Promote.`
      : "No proprietary GRC platform conflict detected in the fetched corpus or HOLD list.";

  const bestWedge = hasCompetingStack
    ? "None for Path B cold — defer to research/partner track after seats filled"
    : pain.result === "PASS"
      ? "Evidence reuse / authorized portfolio oversight across client programs"
      : "Isolation of control evidence and faster leadership reporting";

  const bestChannel = hasCompetingStack
    ? "No Path B cold contact"
    : hasPromoteReadyEmail
      ? "Email (Resend) after Promote → SalesTeam poll → human DISPATCH"
      : input.hasRealEmail
        ? "Company intake only — enrich named-buyer inbox before Promote; phone/switchboard as backup"
        : input.hasPhone
          ? "Phone / switchboard (SMS deferred) — confirm buyer then email"
          : "Enrich email first; LinkedIn review link only (no scrape, no auto-message)";

  const personalizationFact = hasCompetingStack
    ? proprietaryPlatform
      ? `Their public stack includes ${proprietaryPlatform} — do not pitch Ironframe as a replacement GRC for their practice clients.`
      : "Account is on shortlist HOLD — personalization is for research notes only, not cold Path B copy."
    : primary?.name
      ? `Lead with ${primary.name}'s public role (${primary.title ?? primary.purchaseRole}) and the harvest trigger${trigger ? ` (${trigger})` : ""}; ask about portfolio evidence consolidation, not a generic CISO compliment.`
      : "Personalize only after a named buyer and a concrete trigger fact are on the brief.";

  const whyThisApproach = hasCompetingStack
    ? "HOLD protects Path B seats: pitching into a practice that ships its own GRC burns trust and wastes DISPATCH quota. Keep the row for competitive intelligence; do not Promote for cold design-partner outreach."
    : outreachStatus === "promote"
      ? "Fit, pain, buyer, and email gates support a human-led Promote → SalesTeam draft → Approve DISPATCH. Email-first keeps SMS unused until proven."
      : "Gates are incomplete — clear Fit, Pain, Buyer, and Email (named person + real inbox) before any outreach so Approvals never invent a buyer story.";

  const whatToSay = hasCompetingStack
    ? `Do not send Path B cold outreach. Internal note only: "${input.company} appears to be a ${classification} (${proprietaryPlatform ?? "HOLD"}). Revisit only for non-Path-B partner/ecosystem motions after design-partner seats are filled."`
    : primary?.name
      ? `Draft angle (human edit before DISPATCH): "We work with MSSP/vCISO practices that need an authorized view across client GRC programs without rebuilding evidence each audit. Given your ${primary.title ?? "leadership"} role${trigger ? ` and the ${trigger} signal` : ""}, is portfolio oversight or evidence reuse the sharper pain this quarter?"`
      : "Do not invent a talk track until a named buyer is confirmed. Research note: ask who owns multi-client GRC reporting once a contact is identified.";

  const questionToAsk = hasCompetingStack
    ? "Internal only: Does any non-competing integration or referral motion exist later — not a Path B seat?"
    : "Where does leadership today get a single trustworthy view of control evidence across client programs — and what breaks when audits stack?";

  const claimsToAvoid = hasCompetingStack
    ? [
        "Do not claim Ironframe replaces their proprietary GRC.",
        "Do not imply they are a Path B design partner.",
        "Do not DISPATCH email/SMS while HOLD.",
      ]
    : [
        "Do not claim verified email if status is pattern_guess.",
        "Do not cite LinkedIn profile details you did not personally review.",
        "Do not invent ALE / USD exposure figures.",
        "Do not mention Path B, demo tenants, or internal queue names in client copy.",
      ];

  const sourceLedger: AccountResearchBriefSource[] = [];
  for (const url of uniqueStrings(input.sourceUrls).slice(0, 12)) {
    sourceLedger.push({
      title: "Fetched public page",
      url,
      accessedAt: generatedAt,
      excerpt: "Included in buying-committee / brief corpus.",
      confidence: "verified",
    });
  }
  for (const url of [...linkedInUrls, ...youtubeUrls, ...facebookUrls].slice(0, 8)) {
    sourceLedger.push({
      title: "Public social profile link",
      url,
      accessedAt: generatedAt,
      excerpt:
        url.includes("linkedin")
          ? "LinkedIn link only — operator review; not scraped."
          : "Social About/channel link used as evidence pointer.",
      confidence: url.includes("linkedin") ? "hypothesis" : "inference",
    });
  }
  if (hold) {
    sourceLedger.push({
      title: "Path B HOLD shortlist",
      url: null,
      accessedAt: generatedAt,
      excerpt: "Company matched SALES_DISPATCH_HOLD_COMPANIES (channel/competitor).",
      confidence: "verified",
    });
  }
  if (proprietaryPlatform && /pivot|blueradius|oscar|radius/i.test(proprietaryPlatform + input.company)) {
    sourceLedger.push({
      title: "Proprietary GRC conflict rule",
      url: null,
      accessedAt: generatedAt,
      excerpt: `${proprietaryPlatform} conflict → HOLD / competitor classification for Path B cold.`,
      confidence: "verified",
    });
  }

  return {
    generatedAt,
    howToUse:
      "Read snapshot + Fit·Pain·Buyer·Email first. If any gate is FAIL or status is HOLD/DROP, stop — do not Promote for Path B cold. Buyer PASS with Email UNKNOWN means enrich Apollo/Prospeo (or paste a verified inbox) before Promote. If all Pass, use Outreach (why + what to say) to edit a draft after SalesTeam poll; confirm emails marked pattern_guess before DISPATCH. Treat LinkedIn/YouTube as evidence to open, not as the brief.",
    snapshot: {
      company: input.company,
      websiteUrl: input.websiteUrl,
      employeeRange: null,
      practiceType: practiceTypeFromServices(services, input.industrySector),
      estimatedClientScale: null,
      relevantServices: services,
      existingGrcProducts: products,
      status,
    },
    gates: { fit, pain, buyer, email },
    buyerMap,
    triggerEvidence,
    linkedInIntelligence: {
      urls: linkedInUrls,
      operatorPrompt:
        "Open each LinkedIn URL yourself. Capture only: current role/tenure, topics they post about, recent announcements, wording for customer problems, warm paths, activity. Do not paste a full profile summary into outreach.",
      extractedFacts: [],
    },
    youtubeIntelligence: {
      urls: youtubeUrls,
      operatorPrompt:
        "Skim webinars/podcasts for commercially relevant clips with timestamps — problems they repeat, tools they use, what they criticize, client types, product overlap, unresolved pain. Not a page-by-page transcript.",
      extractedClips: [],
    },
    competitiveConflict: {
      proprietaryPlatform,
      preferredPartners: facebookUrls.length || youtubeUrls.length ? ["Public social presence noted"] : [],
      classification,
      finding: competitiveFinding,
      relationshipNote: hasCompetingStack
        ? "Ironframe would compete with or confuse their own GRC offering — classify HOLD/competitor, not design partner."
        : "If a stack appears later, reclassify replace vs integrate vs complement before any DISPATCH.",
    },
    outreach: {
      status: outreachStatus,
      bestWedge,
      bestChannel,
      primaryBuyer: primary?.name ?? null,
      secondaryBuyer: secondary?.name ?? null,
      personalizationFact,
      whyThisApproach,
      whatToSay,
      questionToAsk,
      claimsToAvoid,
      howToUse: hasCompetingStack
        ? "Mark/keep HOLD. Skip Promote and Approvals DISPATCH. Optionally archive thin dups. Revisit only under a separate partner motion later."
        : outreachStatus === "promote"
          ? "1) Confirm buyer email/phone. 2) Promote SUSPECT→PROSPECT. 3) SalesTeam poll. 4) Edit draft using whatToSay + questionToAsk. 5) Human DISPATCH email-first."
          : "Enrich missing gates (website, named buyer, real email). Re-run Harvest+research. Do not invent outreach copy.",
    },
    sourceLedger,
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

export type AccountResearchBriefSelection = {
  brief: AccountResearchBrief;
  shouldPersist: boolean;
  reasons: string[];
};

/**
 * Prefer persisted brief (rich scrape corpus / operator adjudication) unless Buyer,
 * Email, or roster drifted. When improving, merge gates onto the persisted brief so
 * company-intake UNKNOWN findings are not wiped by a thin report rebuild — and so
 * Prospeo personal-inbox PASS does land in CRM.
 */
export function selectAccountResearchBriefForReport(
  persistedBrief: AccountResearchBrief | null,
  rebuiltBrief: AccountResearchBrief,
): AccountResearchBriefSelection {
  if (!persistedBrief) {
    return { brief: rebuiltBrief, shouldPersist: true, reasons: ["missing_brief"] };
  }

  const buyerImproved =
    persistedBrief.gates.buyer.result === "FAIL" &&
    rebuiltBrief.gates.buyer.result !== "FAIL";
  const buyerDegraded =
    persistedBrief.gates.buyer.result === "PASS" &&
    rebuiltBrief.gates.buyer.result !== "PASS";
  const emailMissing = !persistedBrief.gates?.email;
  const emailImproved =
    persistedBrief.gates.email?.result !== "PASS" &&
    rebuiltBrief.gates.email?.result === "PASS";
  const emailDegraded =
    persistedBrief.gates.email?.result === "PASS" &&
    rebuiltBrief.gates.email?.result !== "PASS";
  const persistedBuyerNames = (persistedBrief.buyerMap ?? [])
    .map((b) => (b.name ?? "").trim().toLowerCase())
    .filter(Boolean)
    .sort()
    .join("|");
  const rebuiltBuyerNames = rebuiltBrief.buyerMap
    .map((b) => (b.name ?? "").trim().toLowerCase())
    .filter(Boolean)
    .sort()
    .join("|");
  const buyerRosterChanged = persistedBuyerNames !== rebuiltBuyerNames;

  const reasons: string[] = [];
  if (buyerImproved) reasons.push("buyer_improved");
  if (buyerDegraded) reasons.push("buyer_degraded");
  if (emailMissing) reasons.push("email_gate_missing");
  if (emailImproved) reasons.push("email_improved");
  if (emailDegraded) reasons.push("email_degraded");
  if (buyerRosterChanged) reasons.push("buyer_roster_changed");

  if (reasons.length === 0) {
    return { brief: persistedBrief, shouldPersist: false, reasons };
  }

  // Schema repair: legacy briefs without Email gate need the full rebuilt shape.
  if (emailMissing && !emailImproved && !buyerImproved) {
    return {
      brief: rebuiltBrief,
      shouldPersist: true,
      reasons,
    };
  }

  // Keep scrape/operator corpus; overlay rebuilt Buyer/Email/outreach decision surfaces.
  const brief: AccountResearchBrief = {
    ...persistedBrief,
    gates: {
      ...persistedBrief.gates,
      buyer: rebuiltBrief.gates.buyer,
      email: rebuiltBrief.gates.email,
    },
    buyerMap: rebuiltBrief.buyerMap.length > 0 ? rebuiltBrief.buyerMap : persistedBrief.buyerMap,
    outreach: rebuiltBrief.outreach,
    snapshot: {
      ...persistedBrief.snapshot,
      status: rebuiltBrief.snapshot.status,
    },
    generatedAt: rebuiltBrief.generatedAt ?? persistedBrief.generatedAt,
  };

  return {
    brief,
    // Persist degrades too — e.g. operator channel_competitor HOLD must not leave CRM on promote.
    shouldPersist: reasons.length > 0,
    reasons,
  };
}

/** Parse persisted brief from contact.metadata when present. */
export function resolveAccountResearchBrief(metadata: unknown): AccountResearchBrief | null {
  const meta = asRecord(metadata);
  const raw = asRecord(meta?.accountResearchBrief);
  if (!raw || typeof raw.generatedAt !== "string") return null;
  // Trust structured persist from our builder; re-hydrate lightly.
  return raw as unknown as AccountResearchBrief;
}
