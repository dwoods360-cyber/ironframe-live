import "server-only";

import type { Prisma } from "@prisma/client";

import { buildAccountResearchBrief, mergeNamedBuyerIntoBriefMembers } from "@/app/lib/server/ironleadsAccountResearchBrief";
import {
  extractBuyingPersons,
  discoverPublishedEmails,
  extractPublicSocialLinks,
  extractSameOriginTeamPageUrls,
  extractTradeShowAndEventSignals,
  extractUsPhones,
  buildEmailPermutationCandidates,
  inferEmailLocalPattern,
  isPlausiblePersonName,
  looksLikeOsintTitleNoise,
  publishedEmailMatchesPerson,
  isRoleLocalPart,
  RESEARCH_PATHS,
  socialAboutFetchUrl,
  stripHtmlToText,
  type BuyingRole,
  type PublicSocialLink,
  type PublishedEmailHit,
  type TradeShowEventSignal,
} from "@/app/lib/server/ironleadsBuyingCommitteeExtract";
import { normalizeAccountDomain } from "@/app/lib/ingress/ironleadsSuspectIdentity";
import {
  checkMailboxHygieneMany,
  mailboxHygieneLabel,
  type MailboxHygieneResult,
} from "@/app/lib/server/emailMailboxHygiene";
import {
  isGoogleLeadershipSearchConfigured,
  searchCompanyProspectOsint,
} from "@/app/lib/server/googleLeadershipSearchClient";
import { isEmailAggregatorUrl } from "@/app/lib/server/ironleadsLeadershipSearchAllowlist";
import { scoreSuspectReadiness } from "@/app/lib/ironleadsSuspectReadiness";
import { isOperatorHoldArchived } from "@/app/lib/server/ironleadsOperatorHoldCore";
import {
  websiteUrlFromDomainOrUrl,
} from "@/app/lib/server/ironleadsSuspectLocation";
import { probeCompanyWebsite } from "@/app/lib/server/ironleadsWebsiteProbeCore";
import { withProspectPoolTenant } from "@/app/lib/server/ironleadsTenantScope";

export type BuyingCommitteeEmail = {
  email: string;
  status: "published" | "pattern_guess";
  source: string | null;
  /** Format + MX hygiene only — not ownership proof. */
  mailboxCheck?: {
    ok: boolean;
    formatOk: boolean;
    mxOk: boolean | null;
    reason: string;
    label: string;
    checkedAt: string;
  } | null;
};

export type BuyingCommitteePhone = {
  phone: string;
  kind: "switchboard" | "direct";
  status: "published" | "pattern_guess";
  source: string | null;
};

export type BuyingCommitteeMember = {
  role: BuyingRole;
  fullName: string | null;
  title: string | null;
  emails: BuyingCommitteeEmail[];
  phones: BuyingCommitteePhone[];
  sourceUrls: string[];
  note: string | null;
};

export type BuyingCommitteeResearchResult = {
  contactId: string;
  company: string;
  skipped: boolean;
  skipReason: string | null;
  websiteUrl: string | null;
  members: BuyingCommitteeMember[];
  switchboardPhones: BuyingCommitteePhone[];
  publishedEmails: string[];
  /** Initial-search mailto / directory / body hits (before pattern guesses). */
  publishedEmailDiscovery?: PublishedEmailHit[];
  /** Trade show / conference booth, speaker, hosted-event clues from site copy. */
  tradeShowAndEventSignals?: TradeShowEventSignal[];
  pagesFetched: number;
  socialProfiles: PublicSocialLink[];
  socialPagesFetched: number;
  researchedAt: string;
};

type ContactRow = {
  id: string;
  fullName: string;
  company: string;
  email: string;
  phone: string | null;
  detectedTrigger: string | null;
  industrySector: string | null;
  metadata: unknown;
  primaryDeals: Array<{
    id: string;
    accountDomain: string | null;
    notes: string;
    stage: string;
  }>;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function resolveWebsiteBase(metadata: unknown, accountDomain: string | null): string | null {
  const meta = asRecord(metadata);
  const fromMeta = websiteUrlFromDomainOrUrl(
    typeof meta?.websiteUrl === "string" ? meta.websiteUrl : null,
  );
  if (fromMeta) return fromMeta;
  return websiteUrlFromDomainOrUrl(accountDomain);
}

async function fetchText(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(12_000),
      headers: {
        // Browser-like UA — some MSSP sites serve empty shells to short bot agents.
        "User-Agent":
          "Mozilla/5.0 (compatible; IronleadsResearch/1.1; +https://ironframegrc.com) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,text/plain,*/*",
        "Accept-Language": "en-US,en;q=0.9",
      },
      redirect: "follow",
      cache: "no-store",
    });
    if (!response.ok) return null;
    const contentType = response.headers.get("content-type") ?? "";
    if (
      !contentType.includes("text") &&
      !contentType.includes("html") &&
      !contentType.includes("json")
    ) {
      return null;
    }
    const text = await response.text();
    return text.slice(0, 400_000);
  } catch {
    return null;
  }
}

async function gatherCompanyPages(websiteUrl: string): Promise<
  Array<{ url: string; text: string; rawHtml: string }>
> {
  const base = websiteUrl.replace(/\/$/, "");
  const seedUrls = [base, ...RESEARCH_PATHS.map((path) => `${base}${path}`)];
  const seen = new Set<string>();
  const pages: Array<{ url: string; text: string; rawHtml: string }> = [];

  const fetchOne = async (url: string) => {
    const key = url.replace(/\/$/, "").toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    const raw = await fetchText(url);
    if (!raw || raw.length < 80) return;
    pages.push({ url: url.replace(/\/$/, ""), text: stripHtmlToText(raw), rawHtml: raw });
  };

  // Homepage first so we can discover Meet the Team / Leadership nav links
  // (e.g. /company/meet-the-team/ on pivotpointsecurity.com).
  await fetchOne(base);
  const homeHtml = pages[0]?.rawHtml ?? "";
  const discovered = homeHtml
    ? extractSameOriginTeamPageUrls(homeHtml, base)
    : [];

  for (const url of [...discovered, ...seedUrls.slice(1)]) {
    if (pages.length >= 18) break;
    await fetchOne(url);
  }

  // Second pass: team-page HTML often links to leadership bios — discover once more.
  for (const page of [...pages]) {
    if (pages.length >= 22) break;
    if (!TEAM_PAGE_RETEST.test(page.url)) continue;
    for (const url of extractSameOriginTeamPageUrls(page.rawHtml, base)) {
      if (pages.length >= 22) break;
      await fetchOne(url);
    }
  }

  return pages;
}

const TEAM_PAGE_RETEST =
  /meet[-_]?the[-_]?team|meet[-_]?our[-_]?team|\/leadership|\/team(?:\/|$)|\/people(?:\/|$)/i;

/**
 * Fetch public YouTube/Facebook About pages linked from the company site.
 * Never fetches LinkedIn (ToS) — those stay as operator review links only.
 */
async function gatherPublicSocialPages(
  links: PublicSocialLink[],
): Promise<Array<{ url: string; text: string; network: PublicSocialLink["network"] }>> {
  const pages: Array<{ url: string; text: string; network: PublicSocialLink["network"] }> = [];
  const fetchTargets = links
    .filter((l) => l.fetchable)
    .slice(0, 4)
    .map((l) => ({ link: l, aboutUrl: socialAboutFetchUrl(l) }))
    .filter((t): t is { link: PublicSocialLink; aboutUrl: string } => Boolean(t.aboutUrl));

  for (const { link, aboutUrl } of fetchTargets) {
    const urls = [aboutUrl, link.url].filter((u, i, arr) => arr.indexOf(u) === i);
    for (const url of urls) {
      const raw = await fetchText(url);
      if (!raw || raw.length < 80) continue;
      pages.push({
        url,
        text: stripHtmlToText(raw),
        network: link.network,
      });
      break;
    }
  }
  return pages;
}

async function gatherSearchHitPages(
  urls: string[],
  alreadyFetched: Set<string>,
): Promise<Array<{ url: string; text: string; rawHtml: string }>> {
  const pages: Array<{ url: string; text: string; rawHtml: string }> = [];
  for (const raw of urls) {
    if (pages.length >= 3) break;
    let parsed: URL;
    try {
      parsed = new URL(raw);
    } catch {
      continue;
    }
    if (/linkedin\.com/i.test(parsed.hostname)) continue;
    const key = parsed.href.replace(/\/$/, "").toLowerCase();
    if (alreadyFetched.has(key)) continue;
    alreadyFetched.add(key);
    const html = await fetchText(parsed.href);
    if (!html || html.length < 80) continue;
    pages.push({
      url: parsed.href.replace(/\/$/, ""),
      text: stripHtmlToText(html),
      rawHtml: html,
    });
  }
  return pages;
}

function buildMembers(input: {
  people: ReturnType<typeof extractBuyingPersons>;
  emails: string[];
  phones: string[];
  sourceUrls: string[];
  accountDomain: string | null;
}): BuyingCommitteeMember[] {
  const inferred = inferEmailLocalPattern(input.emails);
  // Primary: published schema when proven; else first.last (~62% MSSP/M365).
  // Also store failover candidates (f.last, first@) — still pattern_guess; MX PASS
  // does not prove ownership (catch-all / gateway domains ~30–35%).
  const guessDomain =
    inferred?.domain ??
    input.accountDomain?.replace(/^www\./i, "").toLowerCase() ??
    null;

  return input.people.map((person) => {
    const emails: BuyingCommitteeEmail[] = [];
    const publishedForPerson = input.emails.filter((email) =>
      publishedEmailMatchesPerson(email, person.fullName),
    );
    for (const email of publishedForPerson.slice(0, 3)) {
      emails.push({
        email,
        status: "published",
        source: "company_website_mailto_or_directory",
      });
    }
    if (emails.length === 0 && guessDomain) {
      const candidates = buildEmailPermutationCandidates(person.fullName, guessDomain, {
        primary: inferred?.pattern ?? null,
        max: 3,
      });
      for (const candidate of candidates) {
        emails.push({
          email: candidate.email,
          status: "pattern_guess",
          source: inferred
            ? `inferred_${candidate.pattern}@${guessDomain}#${candidate.rank}`
            : `assumed_${candidate.pattern}@${guessDomain}#${candidate.rank}`,
        });
      }
    }

    return {
      role: person.role,
      fullName: person.fullName,
      title: person.title,
      emails,
      phones: input.phones.slice(0, 2).map((phone) => ({
        phone,
        kind: "switchboard" as const,
        status: "published" as const,
        source: "company_website",
      })),
      sourceUrls: input.sourceUrls.slice(0, 6),
      note:
        emails.some((e) => e.status === "pattern_guess")
          ? "Email is a pattern guess until published mailto/directory clue or buyer-confirmed. MX PASS ≠ ownership on catch-all domains."
          : null,
    };
  });
}

/**
 * Curated fallback when live fetch fails — public, previously verified appointments only.
 */
function curatedPlaybook(company: string): BuyingCommitteeResearchResult | null {
  if (!/^western alliance bancorporation$/i.test(company.trim())) return null;
  const researchedAt = new Date().toISOString();
  return {
    contactId: "",
    company,
    skipped: false,
    skipReason: null,
    websiteUrl: "https://www.westernalliancebancorporation.com",
    pagesFetched: 0,
    publishedEmails: [
      "swhitlow@westernalliancebank.com",
      "mpondelik@westernalliancebank.com",
    ],
    switchboardPhones: [
      {
        phone: "+16023893500",
        kind: "switchboard",
        status: "published",
        source: "https://www.westernalliancebancorporation.com/contact-us",
      },
    ],
    members: [
      {
        role: "CISO",
        fullName: "Stephen McMaster",
        title: "Chief Information Security Officer",
        emails: [
          {
            email: "smcmaster@westernalliancebank.com",
            status: "pattern_guess",
            source: "inferred_initial_last@westernalliancebank.com",
          },
        ],
        phones: [
          {
            phone: "+16023893500",
            kind: "switchboard",
            status: "published",
            source: "contact-us",
          },
        ],
        sourceUrls: [
          "https://www.businesswire.com/news/home/20260121262396/en/Western-Alliance-Appoints-Stephen-McMaster-as-Chief-Information-Security-Officer",
        ],
        note: "Playbook: public CISO appointment Jan 2026; email pattern-guess only.",
      },
      {
        role: "CEO",
        fullName: "Kenneth A. Vecchione",
        title: "Chairman, President and Chief Executive Officer",
        emails: [
          {
            email: "kvecchione@westernalliancebank.com",
            status: "pattern_guess",
            source: "inferred_initial_last@westernalliancebank.com",
          },
        ],
        phones: [
          {
            phone: "+16023893500",
            kind: "switchboard",
            status: "published",
            source: "contact-us",
          },
        ],
        sourceUrls: [
          "https://www.businesswire.com/news/home/20260615498168/en/Western-Alliance-Appoints-CEO-Kenneth-Vecchione-as-Chairman",
        ],
        note: "Playbook: Chairman since 2026-06-10; CEO since 2018; email pattern-guess only.",
      },
    ],
    socialProfiles: [],
    socialPagesFetched: 0,
    researchedAt,
  };
}

function mergeCandidateEmails(
  prior: unknown,
  members: BuyingCommitteeMember[],
): Array<Record<string, unknown>> {
  const existing = Array.isArray(asRecord(prior)?.candidateEmails)
    ? [...((asRecord(prior) as { candidateEmails: unknown[] }).candidateEmails as unknown[])]
    : [];
  const rows = existing.filter((row) => asRecord(row));
  for (const member of members) {
    if (!member.fullName) continue;
    for (const email of member.emails) {
      const alreadyIdx = rows.findIndex((row) => {
        const r = asRecord(row);
        return r && String(r.email).toLowerCase() === email.email.toLowerCase();
      });
      const mailbox = email.mailboxCheck ?? null;
      const payload = {
        person: member.fullName,
        role: member.role,
        email: email.email,
        confidence: email.status,
        status: email.status === "published" ? "published" : "unverified",
        note: member.note,
        mailboxCheck: mailbox,
        mailboxLabel: mailbox?.label ?? null,
      };
      if (alreadyIdx >= 0) {
        const priorRow = asRecord(rows[alreadyIdx]) ?? {};
        rows[alreadyIdx] = { ...priorRow, ...payload };
      } else {
        rows.push(payload);
      }
    }
  }
  return rows.slice(0, 24) as Array<Record<string, unknown>>;
}

function serializeMailboxCheck(result: MailboxHygieneResult): NonNullable<BuyingCommitteeEmail["mailboxCheck"]> {
  return {
    ok: result.ok,
    formatOk: result.formatOk,
    mxOk: result.mxOk,
    reason: result.reason,
    label: mailboxHygieneLabel(result),
    checkedAt: result.checkedAt,
  };
}

function hygieneMemberNote(
  prior: string | null,
  emails: BuyingCommitteeEmail[],
): string | null {
  const fail = emails.find((e) => e.mailboxCheck && !e.mailboxCheck.ok)?.mailboxCheck;
  let extra: string | null = null;
  if (fail?.reason === "format_invalid") {
    extra = "Mailbox hygiene FAIL: invalid email format.";
  } else if (fail?.reason === "mx_missing") {
    extra = "Mailbox hygiene FAIL: domain has no MX — likely not mail-routable.";
  } else if (fail?.reason === "mx_lookup_failed") {
    extra = "Mailbox hygiene inconclusive: MX lookup failed.";
  } else if (emails.some((e) => e.status === "pattern_guess" && e.mailboxCheck?.ok)) {
    extra =
      "Mailbox hygiene PASS (format+MX) — still a pattern guess until published or buyer confirms.";
  }
  if (!extra) return prior;
  if (prior?.includes(extra)) return prior;
  return prior ? `${prior} ${extra}` : extra;
}

function mergeCommitteeEmails(
  prior: BuyingCommitteeEmail[],
  incoming: BuyingCommitteeEmail[],
): BuyingCommitteeEmail[] {
  const byEmail = new Map<string, BuyingCommitteeEmail>();
  for (const row of [...prior, ...incoming]) {
    const key = row.email.toLowerCase();
    const prev = byEmail.get(key);
    if (!prev) {
      byEmail.set(key, row);
      continue;
    }
    if (row.status === "published" && prev.status !== "published") {
      byEmail.set(key, { ...prev, ...row });
    }
  }
  return [...byEmail.values()].slice(0, 5);
}

export function mergeBuyingCommitteeMembers(
  prior: BuyingCommitteeMember[],
  incoming: BuyingCommitteeMember[],
): BuyingCommitteeMember[] {
  const byRole = new Map<BuyingRole, BuyingCommitteeMember>();
  for (const member of prior) {
    if (!member.fullName || !isPlausiblePersonName(member.fullName)) continue;
    byRole.set(member.role, member);
  }
  for (const member of incoming) {
    if (!member.fullName || !isPlausiblePersonName(member.fullName)) continue;
    const existing = byRole.get(member.role);
    if (!existing) {
      byRole.set(member.role, member);
      continue;
    }
    const samePerson =
      existing.fullName.trim().toLowerCase() === member.fullName.trim().toLowerCase();
    byRole.set(member.role, {
      ...existing,
      title: existing.title ?? member.title,
      emails: mergeCommitteeEmails(existing.emails, member.emails),
      phones: existing.phones.length > 0 ? existing.phones : member.phones,
      sourceUrls: [...new Set([...existing.sourceUrls, ...member.sourceUrls])].slice(0, 8),
      note: existing.note ?? member.note,
      fullName: samePerson ? existing.fullName : existing.fullName,
    });
  }
  return [...byRole.values()];
}

function hasPersonalPublishedEmail(result: {
  members: BuyingCommitteeMember[];
  publishedEmails: string[];
}): boolean {
  const fromMembers = result.members.some((m) =>
    m.emails.some((e) => {
      if (e.status !== "published") return false;
      const local = e.email.split("@")[0] ?? "";
      return !isRoleLocalPart(local);
    }),
  );
  if (fromMembers) return true;
  return result.publishedEmails.some((email) => {
    const local = email.split("@")[0] ?? "";
    return !isRoleLocalPart(local);
  });
}

/** Run public-web OSINT unless a named buyer AND a personal published email are already on file. */
export function dossierNeedsPublicOsint(result: {
  members: BuyingCommitteeMember[];
  publishedEmails: string[];
}): boolean {
  const named = result.members.filter(
    (m) => m.fullName && isPlausiblePersonName(m.fullName),
  );
  if (named.length === 0) return true;
  const hasBuyer = named.some(
    (m) =>
      m.role === "CISO" ||
      m.role === "CEO" ||
      m.role === "GRC_PRACTICE_LEAD" ||
      m.role === "MANAGING_DIRECTOR",
  );
  if (!hasBuyer) return true;
  return !hasPersonalPublishedEmail(result);
}

function downgradeAggregatorEmails(
  members: BuyingCommitteeMember[],
): BuyingCommitteeMember[] {
  return members.map((member) => ({
    ...member,
    emails: member.emails.map((row) => {
      const fromAggregator = (member.sourceUrls ?? []).some((url) =>
        isEmailAggregatorUrl(url),
      );
      if (!fromAggregator || row.status !== "published") return row;
      return {
        ...row,
        status: "pattern_guess" as const,
        source: row.source ?? "aggregator_snippet",
      };
    }),
    note:
      member.sourceUrls.some((url) => isEmailAggregatorUrl(url)) &&
      member.emails.some((e) => e.status === "published" || e.source === "aggregator_snippet")
        ? member.note?.includes("aggregator")
          ? member.note
          : [member.note, "Aggregator/directory email is a hint — not Email PASS until Hunter/Prospeo valid."]
              .filter(Boolean)
              .join(" ")
        : member.note,
  }));
}

/** Attach format+MX hygiene to committee emails (does not upgrade pattern_guess → published). */
async function attachMailboxHygiene(
  members: BuyingCommitteeMember[],
): Promise<BuyingCommitteeMember[]> {
  const emails = members.flatMap((m) => m.emails.map((e) => e.email));
  if (emails.length === 0) return members;
  const checks = await checkMailboxHygieneMany(emails);
  return members.map((member) => {
    const nextEmails = member.emails.map((row) => {
      const check = checks.get(row.email.toLowerCase()) ?? null;
      return {
        ...row,
        mailboxCheck: check ? serializeMailboxCheck(check) : null,
      };
    });
    return {
      ...member,
      emails: nextEmails,
      note: hygieneMemberNote(member.note, nextEmails),
    };
  });
}

export async function researchBuyingCommitteeForContact(
  contactId: string,
): Promise<BuyingCommitteeResearchResult | null> {
  const contact = await withProspectPoolTenant((tx, tenantId) =>
    tx.ironboardCrmContact.findFirst({
    where: { id: contactId, tenantId },
    select: {
      id: true,
      fullName: true,
      company: true,
      email: true,
      phone: true,
      detectedTrigger: true,
      industrySector: true,
      metadata: true,
      primaryDeals: {
        where: { stage: "SUSPECT" },
        orderBy: { updatedAt: "desc" },
        take: 1,
        select: { id: true, accountDomain: true, notes: true, stage: true },
      },
    },
    }),
  );
  if (!contact) return null;
  return researchAndPersist(contact);
}

async function researchAndPersist(contact: ContactRow): Promise<BuyingCommitteeResearchResult> {
  const researchedAt = new Date().toISOString();
  const deal = contact.primaryDeals[0] ?? null;
  const accountDomain = deal?.accountDomain ?? null;

  if (looksLikeOsintTitleNoise(contact.company)) {
    return {
      contactId: contact.id,
      company: contact.company,
      skipped: true,
      skipReason: "OSINT title noise — not a buyer company",
      websiteUrl: null,
      members: [],
      switchboardPhones: [],
      publishedEmails: [],
      pagesFetched: 0,
      socialProfiles: [],
      socialPagesFetched: 0,
      researchedAt,
    };
  }

  let websiteUrl = resolveWebsiteBase(contact.metadata, accountDomain);
  if (!websiteUrl && contact.company?.trim()) {
    websiteUrl = await probeCompanyWebsite(contact.company);
  }
  let pages: Array<{ url: string; text: string; rawHtml: string }> = [];
  if (websiteUrl) {
    pages = await gatherCompanyPages(websiteUrl);
  }

  const socialProfiles = extractPublicSocialLinks(
    pages.map((p) => p.rawHtml).join("\n"),
  );
  const socialPages = await gatherPublicSocialPages(socialProfiles);

  const playbook = curatedPlaybook(contact.company);
  let result: BuyingCommitteeResearchResult;

  if (pages.length === 0 && socialPages.length === 0) {
    if (playbook) {
      result = {
        ...playbook,
        contactId: contact.id,
        socialProfiles,
        socialPagesFetched: 0,
      };
    } else {
      result = {
        contactId: contact.id,
        company: contact.company,
        skipped: true,
        skipReason: websiteUrl
          ? "No fetchable leadership/contact pages"
          : "Missing website/domain for research",
        websiteUrl,
        members: [],
        switchboardPhones: [],
        publishedEmails: [],
        pagesFetched: 0,
        socialProfiles,
        socialPagesFetched: 0,
        researchedAt,
      };
    }
  } else {
    const corpus = [...pages.map((p) => p.text), ...socialPages.map((p) => p.text)].join(
      " \n ",
    );
    const sourceUrls = [
      ...pages.map((p) => p.url),
      ...socialPages.map((p) => p.url),
    ];
    // INITIAL SEARCH (before pattern guesses): mailto hrefs + directory labels + body text
    // on company pages, then social about pages. Legal/terms paths are in RESEARCH_PATHS.
    const discoveryByEmail = new Map<string, PublishedEmailHit>();
    for (const page of pages) {
      for (const hit of discoverPublishedEmails({
        html: page.rawHtml,
        text: page.text,
        accountDomain,
      })) {
        const prev = discoveryByEmail.get(hit.email);
        const rank = { mailto: 3, directory_label: 2, body_text: 1 } as const;
        if (!prev || rank[hit.kind] > rank[prev.kind]) {
          discoveryByEmail.set(hit.email, hit);
        }
      }
    }
    for (const page of socialPages) {
      for (const hit of discoverPublishedEmails({
        html: null,
        text: page.text,
        accountDomain,
      })) {
        if (!discoveryByEmail.has(hit.email)) discoveryByEmail.set(hit.email, hit);
      }
    }
    const publishedEmailDiscovery = [...discoveryByEmail.values()];
    const tradeShowAndEventSignals: TradeShowEventSignal[] = [];
    const tradeSeen = new Set<string>();
    for (const page of pages) {
      for (const signal of extractTradeShowAndEventSignals(page.text, page.url)) {
        const key = `${signal.eventName}|${signal.kind}|${signal.detail ?? ""}`.toLowerCase();
        if (tradeSeen.has(key)) continue;
        tradeSeen.add(key);
        tradeShowAndEventSignals.push(signal);
      }
    }
    const emails = [
      ...publishedEmailDiscovery.map((h) => h.email),
      ...(playbook?.publishedEmails ?? []),
    ];
    const phones = [
      ...extractUsPhones(corpus),
      ...(playbook?.switchboardPhones.map((p) => p.phone) ?? []),
    ];
    const people = extractBuyingPersons(corpus).filter((p) =>
      isPlausiblePersonName(p.fullName),
    );
    const liveMembers = buildMembers({
      people,
      emails: [...new Set(emails)],
      phones: [...new Set(phones)],
      sourceUrls,
      accountDomain,
    });

    // Playbook fills gaps only — live About/team parse wins when it has a name.
    const playbookMembers = playbook?.members ?? [];
    const mergedByRole = new Map<BuyingRole, BuyingCommitteeMember>();
    for (const member of playbookMembers) mergedByRole.set(member.role, member);
    for (const member of liveMembers) {
      if (!member.fullName || !isPlausiblePersonName(member.fullName)) continue;
      mergedByRole.set(member.role, member);
    }

    result = {
      contactId: contact.id,
      company: contact.company,
      skipped: false,
      skipReason: null,
      websiteUrl,
      members: [...mergedByRole.values()],
      switchboardPhones:
        phones.length > 0
          ? phones.slice(0, 3).map((phone) => ({
              phone,
              kind: "switchboard" as const,
              status: "published" as const,
              source: sourceUrls.find((u) => /contact/i.test(u)) ?? sourceUrls[0] ?? null,
            }))
          : (playbook?.switchboardPhones ?? []),
      publishedEmails: emails.length > 0 ? emails : (playbook?.publishedEmails ?? []),
      publishedEmailDiscovery,
      tradeShowAndEventSignals: tradeShowAndEventSignals.slice(0, 20),
      pagesFetched: pages.length,
      socialProfiles,
      socialPagesFetched: socialPages.length,
      researchedAt,
    };
  }

  // Public-web buyer/email OSINT (Brave → SerpAPI → CSE): leadership + email +
  // events + filings. Runs when the site scrape is missing a named buyer or a
  // personal work seat — not only when zero names were found.
  let googleCorpus = "";
  let googleSourceUrls: string[] = [];
  let googleLeadershipSearch: {
    queriedAt: string;
    ok: boolean;
    configured: boolean;
    provider: string | null;
    cascadedFrom?: string[];
    hitCount: number;
    sourceUrls: string[];
    error: string | null;
    queries?: Array<{
      kind: string;
      query: string;
      hitCount: number;
      provider: string;
    }>;
  } | null = null;
  if (dossierNeedsPublicOsint(result)) {
    if (!isGoogleLeadershipSearchConfigured()) {
      googleLeadershipSearch = {
        queriedAt: researchedAt,
        ok: false,
        configured: false,
        provider: null,
        hitCount: 0,
        sourceUrls: [],
        error:
          "No leadership search provider configured (set BRAVE_SEARCH_API_KEY and/or SERPAPI_API_KEY)",
      };
    } else {
      const google = await searchCompanyProspectOsint({
        company: contact.company,
        domain: accountDomain,
      });
      if (!google.ok) {
        googleLeadershipSearch = {
          queriedAt: researchedAt,
          ok: false,
          configured: google.configured,
          provider: google.provider,
          cascadedFrom: google.cascadedFrom,
          hitCount: 0,
          sourceUrls: [],
          error: google.error.slice(0, 240),
        };
      } else {
        const alreadyFetched = new Set(
          pages.map((p) => p.url.replace(/\/$/, "").toLowerCase()),
        );
        const extraPages = await gatherSearchHitPages(
          google.sourceUrls,
          alreadyFetched,
        );
        if (extraPages.length > 0) {
          pages = [...pages, ...extraPages];
        }

        googleCorpus = [
          google.corpus,
          ...extraPages.map((p) => p.text),
        ]
          .filter(Boolean)
          .join(" \n ");
        googleSourceUrls = [
          ...google.sourceUrls,
          ...extraPages.map((p) => p.url),
        ];
        googleLeadershipSearch = {
          queriedAt: researchedAt,
          ok: true,
          configured: true,
          provider: google.provider,
          cascadedFrom: google.cascadedFrom,
          hitCount: google.hits.length,
          sourceUrls: googleSourceUrls.slice(0, 12),
          error: null,
          queries: google.queries,
        };

        const discoveryMerged = new Map(
          (result.publishedEmailDiscovery ?? []).map((h) => [h.email, h] as const),
        );
        const googleEmails: string[] = [];
        const aggregatorEmails = new Set<string>();

        const ingestText = (text: string, sourceUrl: string | null, html?: string) => {
          for (const hit of discoverPublishedEmails({
            html: html ?? null,
            text,
            accountDomain,
          })) {
            if (!discoveryMerged.has(hit.email)) discoveryMerged.set(hit.email, hit);
            googleEmails.push(hit.email);
            if (sourceUrl && isEmailAggregatorUrl(sourceUrl)) {
              aggregatorEmails.add(hit.email.toLowerCase());
            }
          }
        };
        ingestText(google.corpus, google.sourceUrls[0] ?? null);
        for (const hit of google.hits) {
          ingestText(`${hit.title} ${hit.snippet}`, hit.link);
        }
        for (const page of extraPages) {
          ingestText(page.text, page.url, page.rawHtml);
        }

        const googlePeople = extractBuyingPersons(googleCorpus).filter((p) =>
          isPlausiblePersonName(p.fullName),
        );
        if (googlePeople.length > 0 || googleEmails.length > 0) {
          const googleMembers = downgradeAggregatorEmails(
            buildMembers({
              people: googlePeople,
              emails: [...new Set([...result.publishedEmails, ...googleEmails])],
              phones: [],
              sourceUrls: googleSourceUrls,
              accountDomain,
            }).map((member) => ({
              ...member,
              emails: member.emails.map((row) =>
                aggregatorEmails.has(row.email.toLowerCase())
                  ? {
                      ...row,
                      status: "pattern_guess" as const,
                      source: row.source ?? "aggregator_snippet",
                    }
                  : row,
              ),
              note:
                member.note ??
                `Public-web OSINT (${google.provider}) — confirm before Promote`,
            })),
          );
          result = {
            ...result,
            skipped: false,
            skipReason: null,
            members: mergeBuyingCommitteeMembers(result.members, googleMembers),
            publishedEmails: [
              ...new Set([
                ...result.publishedEmails,
                ...googleEmails.filter((e) => !aggregatorEmails.has(e.toLowerCase())),
              ]),
            ],
            publishedEmailDiscovery: [...discoveryMerged.values()],
            pagesFetched: pages.length,
          };
        }
      }
    }
  }

  // Drop scrape junk that slipped past role extract before name hardening.
  if (result.members.length > 0) {
    result = {
      ...result,
      members: result.members.filter(
        (m) => !m.fullName || isPlausiblePersonName(m.fullName),
      ),
    };
  }

  if (result.members.length > 0) {
    result = {
      ...result,
      members: await attachMailboxHygiene(result.members),
    };
  }

  const corpus =
    pages.length || socialPages.length || googleCorpus
      ? [
          ...pages.map((p) => p.text),
          ...socialPages.map((p) => p.text),
          googleCorpus,
        ]
          .filter(Boolean)
          .join(" \n ")
      : "";
  const sourceUrls = [
    ...pages.map((p) => p.url),
    ...socialPages.map((p) => p.url),
    ...googleSourceUrls,
    ...result.members.flatMap((m) => m.sourceUrls),
  ];

  await persistResearch(contact, result, {
    corpus,
    sourceUrls,
    googleLeadershipSearch,
  });
  return result;
}

async function persistResearch(
  contact: ContactRow,
  result: BuyingCommitteeResearchResult,
  evidence: {
    corpus: string;
    sourceUrls: string[];
    googleLeadershipSearch?: {
      queriedAt: string;
      ok: boolean;
      configured: boolean;
      provider: string | null;
      cascadedFrom?: string[];
      hitCount: number;
      sourceUrls: string[];
      error: string | null;
      queries?: Array<{
        kind: string;
        query: string;
        hitCount: number;
        provider: string;
      }>;
    } | null;
  },
): Promise<void> {
  const IRONLEADS_LOCAL = /@ironleads\.local$/i;
  const hasRealEmail = Boolean(contact.email) && !IRONLEADS_LOCAL.test(contact.email);
  const hasPhone = Boolean(contact.phone?.trim() || result.switchboardPhones[0]?.phone);
  const priorMeta = asRecord(contact.metadata) ?? {};
  const priorNamedBuyer = asRecord(priorMeta.namedBuyer);
  const briefMembers = mergeNamedBuyerIntoBriefMembers({
    members: result.members,
    namedBuyer:
      priorNamedBuyer && typeof priorNamedBuyer.fullName === "string"
        ? {
            fullName: priorNamedBuyer.fullName,
            title: typeof priorNamedBuyer.title === "string" ? priorNamedBuyer.title : null,
            role: typeof priorNamedBuyer.role === "string" ? priorNamedBuyer.role : null,
            email: typeof priorNamedBuyer.email === "string" ? priorNamedBuyer.email : null,
            emailStatus:
              typeof priorNamedBuyer.emailStatus === "string"
                ? priorNamedBuyer.emailStatus
                : null,
            linkedinUrl:
              typeof priorNamedBuyer.linkedinUrl === "string"
                ? priorNamedBuyer.linkedinUrl
                : null,
          }
        : null,
    contactEmail: hasRealEmail ? contact.email : null,
    contactTitle: null,
  });
  const priorHold = asRecord(asRecord(contact.metadata)?.operatorHold);
  const pathBHold =
    priorHold?.classification === "channel_competitor" ||
    priorHold?.classification === "hold";
  const brief = buildAccountResearchBrief({
    company: contact.company,
    websiteUrl: result.websiteUrl,
    detectedTrigger: contact.detectedTrigger,
    industrySector: contact.industrySector,
    dealStage: contact.primaryDeals[0]?.stage ?? "SUSPECT",
    corpus: evidence.corpus,
    sourceUrls: evidence.sourceUrls,
    members: briefMembers,
    socialProfiles: result.socialProfiles,
    hasRealEmail,
    contactEmail: hasRealEmail ? contact.email : null,
    pathBHold,
    hasPhone,
    generatedAt: result.researchedAt,
  });

  if (result.skipped && result.members.length === 0) {
    const prior = asRecord(contact.metadata) ?? {};
    await withProspectPoolTenant((tx, tenantId) =>
      tx.ironboardCrmContact.updateMany({
      where: { id: contact.id, tenantId },
      data: {
        metadata: {
          ...prior,
          buyingCommittee: {
            researchedAt: result.researchedAt,
            skipped: true,
            skipReason: result.skipReason,
            members: [],
            socialProfiles: result.socialProfiles,
            socialPagesFetched: result.socialPagesFetched,
          },
          accountResearchBrief: brief,
        } as Prisma.InputJsonValue,
      },
    }),
    );
    return;
  }

  const prior = asRecord(contact.metadata) ?? {};
  const ciso = result.members.find(
    (m) => m.role === "CISO" && m.fullName && isPlausiblePersonName(m.fullName),
  );
  const ceo = result.members.find(
    (m) => m.role === "CEO" && m.fullName && isPlausiblePersonName(m.fullName),
  );
  const practiceLead = result.members.find(
    (m) =>
      m.role === "GRC_PRACTICE_LEAD" &&
      m.fullName &&
      isPlausiblePersonName(m.fullName),
  );
  const outreachBuyer = ciso ?? practiceLead ?? ceo;
  const switchboard = result.switchboardPhones[0]?.phone ?? null;

  const priorBuyerName =
    typeof priorNamedBuyer?.fullName === "string" ? priorNamedBuyer.fullName : null;
  const priorBuyerPlausible = Boolean(
    priorBuyerName && isPlausiblePersonName(priorBuyerName),
  );
  const priorSponsor = asRecord(prior.executiveSponsor);
  const priorSponsorName =
    typeof priorSponsor?.fullName === "string" ? priorSponsor.fullName : null;
  const priorSponsorPlausible = Boolean(
    priorSponsorName && isPlausiblePersonName(priorSponsorName),
  );

  const namedBuyer = outreachBuyer?.fullName
    ? {
        fullName: outreachBuyer.fullName,
        title:
          outreachBuyer.title ??
          (outreachBuyer.role === "CEO"
            ? "Chief Executive Officer"
            : outreachBuyer.role === "GRC_PRACTICE_LEAD"
              ? "GRC Practice Lead"
              : "Chief Information Security Officer"),
        location: null,
        trigger: outreachBuyer.role === "CISO" ? "NEW_CISO" : "NAMED_BUYER",
        announcedAt: null,
        sourceUrls: outreachBuyer.sourceUrls,
        note: outreachBuyer.note,
        seededAt: result.researchedAt,
      }
    : priorBuyerPlausible
      ? prior.namedBuyer
      : null;

  const executiveSponsor = ceo?.fullName
    ? {
        fullName: ceo.fullName,
        title: ceo.title ?? "Chief Executive Officer",
        roleSince: null,
        chairmanSince: null,
        sourceUrls: ceo.sourceUrls,
        note: ceo.note,
        seededAt: result.researchedAt,
      }
    : priorSponsorPlausible
      ? prior.executiveSponsor
      : null;

  const metadata: Record<string, unknown> = {
    ...prior,
    websiteUrl: result.websiteUrl ?? prior.websiteUrl ?? null,
    buyingCommittee: {
      researchedAt: result.researchedAt,
      skipped: result.skipped,
      skipReason: result.skipReason,
      pagesFetched: result.pagesFetched,
      publishedEmails: result.publishedEmails,
      publishedEmailDiscovery: result.publishedEmailDiscovery ?? [],
      tradeShowAndEventSignals: result.tradeShowAndEventSignals ?? [],
      switchboardPhones: result.switchboardPhones,
      members: result.members,
      socialProfiles: result.socialProfiles,
      socialPagesFetched: result.socialPagesFetched,
      ...(evidence.googleLeadershipSearch != null
        ? { googleLeadershipSearch: evidence.googleLeadershipSearch }
        : {}),
    },
    // Top-level alias for operator briefs / dossiers that look for conference intel.
    ...(result.tradeShowAndEventSignals && result.tradeShowAndEventSignals.length > 0
      ? {
          tradeShowAndEventSignals: result.tradeShowAndEventSignals,
        }
      : {}),
    accountResearchBrief: brief,
    publicSocialProfiles: result.socialProfiles,
    candidateEmails: mergeCandidateEmails(prior, result.members),
    namedBuyer,
    executiveSponsor,
  };

  if (result.websiteUrl) {
    metadata.websiteUrl = result.websiteUrl;
  }
  if (switchboard) {
    metadata.websiteContact = {
      ...(asRecord(prior.websiteContact) ?? {}),
      phone: switchboard,
      email: null,
      contactPageUrl:
        result.switchboardPhones[0]?.source ?? result.websiteUrl,
      note: "HQ/switchboard from buying-committee research",
      seededAt: result.researchedAt,
    };
  }

  const nextPhone = contact.phone?.trim() || switchboard;

  await withProspectPoolTenant(async (tx, tenantId) => {
    await tx.ironboardCrmContact.updateMany({
      where: { id: contact.id, tenantId },
      data: {
        phone: nextPhone,
        metadata: metadata as Prisma.InputJsonValue,
        ...(outreachBuyer?.fullName && isPlausiblePersonName(outreachBuyer.fullName)
          ? {
              fullName: outreachBuyer.fullName,
              title:
                outreachBuyer.role === "CEO"
                  ? "Chief Executive Officer"
                  : outreachBuyer.role === "GRC_PRACTICE_LEAD"
                    ? "GRC Practice Lead"
                    : "Chief Information Security Officer",
            }
          : contact.fullName && !isPlausiblePersonName(contact.fullName)
            ? {
                fullName: `${contact.company} — buyer TBD`,
                title: "",
              }
            : {}),
      },
    });

    const deal = contact.primaryDeals[0];
    if (deal) {
      const derivedDomain =
        normalizeAccountDomain(deal.accountDomain) ||
        normalizeAccountDomain(result.websiteUrl) ||
        normalizeAccountDomain(
          typeof metadata.websiteUrl === "string" ? metadata.websiteUrl : null,
        );
      await tx.ironboardCrmDeal.updateMany({
        where: { id: deal.id, tenantId },
        data: {
          ...(derivedDomain && !deal.accountDomain
            ? { accountDomain: derivedDomain }
            : {}),
          notes: [
            deal.notes?.trim() || "",
            `Buying-committee research ${result.researchedAt}: members=${result.members.map((m) => m.role).join(",") || "none"}; pages=${result.pagesFetched}`,
          ]
            .filter(Boolean)
            .join("\n"),
        },
      });
    }
  });
}

/** Portal Research-only batch size — keeps each Vercel invoke under maxDuration 120s. */
export const IRONLEADS_RESEARCH_BATCH_DEFAULT = 5;
/** Hard cap per invoke (portal sends 5; scripts may pass up to this). */
export const IRONLEADS_RESEARCH_BATCH_MAX = 20;
/**
 * Skip re-researching a *named* dossier within this window so multi-batch runs advance.
 * Thin / empty member dossiers are never cooled — operators can retry immediately.
 * (Was 12m; that forced idle waits after every Research click.)
 */
export const IRONLEADS_RESEARCH_COOLDOWN_MS = 2 * 60 * 1000;
/** Parallel contacts per Research invoke — wall-clock cut without blowing Brave/rate limits. */
export const IRONLEADS_RESEARCH_CONCURRENCY = 2;

function asMetaRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

/** Parse buyingCommittee.researchedAt from CRM metadata (ms since epoch). */
export function buyingCommitteeResearchedAtMs(metadata: unknown): number | null {
  const bc = asMetaRecord(asMetaRecord(metadata)?.buyingCommittee);
  const raw = bc?.researchedAt;
  if (typeof raw !== "string" || !raw.trim()) return null;
  const ms = Date.parse(raw);
  return Number.isFinite(ms) ? ms : null;
}

/** True when buyingCommittee already has at least one named person. */
export function buyingCommitteeHasNamedMember(metadata: unknown): boolean {
  const bc = asMetaRecord(asMetaRecord(metadata)?.buyingCommittee);
  const members = bc?.members;
  if (!Array.isArray(members)) return false;
  return members.some((m) => {
    const row = asMetaRecord(m);
    return typeof row?.fullName === "string" && row.fullName.trim().length > 0;
  });
}

async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  if (items.length === 0) return [];
  const results: R[] = new Array(items.length);
  let next = 0;
  const workerCount = Math.max(1, Math.min(concurrency, items.length));
  await Promise.all(
    Array.from({ length: workerCount }, async () => {
      while (true) {
        const i = next;
        next += 1;
        if (i >= items.length) return;
        results[i] = await fn(items[i]!);
      }
    }),
  );
  return results;
}

/**
 * Pick the next Research batch: thinnest active dossiers first.
 * Named dossiers skip re-research during cooldown so batches advance.
 * Thin / empty dossiers stay eligible immediately (no idle wait to retry).
 */
export function selectSuspectsForResearchBatch<
  T extends {
    metadata: unknown;
    primaryDeals?: Array<{ accountDomain?: string | null }>;
  },
>(
  activeSuspects: T[],
  opts: { limit: number; nowMs?: number; cooldownMs?: number },
): {
  batch: T[];
  cooledDown: number;
  eligibleRemainingAfterBatch: number;
  activeQueue: number;
} {
  const limit = Math.min(
    Math.max(opts.limit, 1),
    IRONLEADS_RESEARCH_BATCH_MAX,
  );
  const nowMs = opts.nowMs ?? Date.now();
  const cooldownMs = opts.cooldownMs ?? IRONLEADS_RESEARCH_COOLDOWN_MS;

  const ranked = [...activeSuspects].sort((a, b) => {
    const sa = scoreSuspectReadiness({
      metadata: a.metadata,
      accountDomain: a.primaryDeals?.[0]?.accountDomain ?? null,
    }).score;
    const sb = scoreSuspectReadiness({
      metadata: b.metadata,
      accountDomain: b.primaryDeals?.[0]?.accountDomain ?? null,
    }).score;
    return sa - sb;
  });

  const eligible: T[] = [];
  let cooledDown = 0;
  for (const row of ranked) {
    const at = buyingCommitteeResearchedAtMs(row.metadata);
    if (
      at != null &&
      nowMs - at < cooldownMs &&
      buyingCommitteeHasNamedMember(row.metadata)
    ) {
      cooledDown += 1;
      continue;
    }
    eligible.push(row);
  }

  const batch = eligible.slice(0, limit);
  return {
    batch,
    cooledDown,
    eligibleRemainingAfterBatch: Math.max(0, eligible.length - batch.length),
    activeQueue: activeSuspects.length,
  };
}

export async function researchBuyingCommitteeForAllSuspects(options?: {
  /** Max SUSPECTs to research in this invoke (default: full active queue cap of 20). */
  limit?: number;
  /** Ignore cooldown (operator force re-run after code/data fix). */
  force?: boolean;
}): Promise<{
  researchedAt: string;
  total: number;
  researched: number;
  skipped: number;
  batchLimit: number;
  activeQueue: number;
  cooledDown: number;
  remaining: number;
  hasMore: boolean;
  results: BuyingCommitteeResearchResult[];
}> {
  const suspectsRaw = await withProspectPoolTenant((tx, tenantId) =>
    tx.ironboardCrmContact.findMany({
    where: { tenantId, primaryDeals: { some: { stage: "SUSPECT" } } },
    orderBy: [{ createdAt: "desc" }, { priorityScore: "desc" }],
    take: 80,
    select: {
      id: true,
      fullName: true,
      company: true,
      email: true,
      phone: true,
      detectedTrigger: true,
      industrySector: true,
      metadata: true,
      primaryDeals: {
        where: { stage: "SUSPECT" },
        orderBy: { updatedAt: "desc" },
        take: 1,
        select: { id: true, accountDomain: true, notes: true, stage: true },
      },
    },
  }),
  );

  // Active only — prefer thinnest dossiers so Research fills gaps (queue UI sorts richest first).
  const activeSuspects = suspectsRaw
    .filter((row) => !isOperatorHoldArchived(row.metadata))
    .slice(0, 20);

  const requestedLimit =
    typeof options?.limit === "number" && Number.isFinite(options.limit)
      ? options.limit
      : activeSuspects.length;

  const selected = selectSuspectsForResearchBatch(activeSuspects, {
    limit: requestedLimit,
    cooldownMs: options?.force === true ? 0 : IRONLEADS_RESEARCH_COOLDOWN_MS,
  });

  const results = await mapPool(
    selected.batch,
    IRONLEADS_RESEARCH_CONCURRENCY,
    (contact) => researchAndPersist(contact),
  );

  return {
    researchedAt: new Date().toISOString(),
    total: results.length,
    researched: results.filter((r) => !r.skipped).length,
    skipped: results.filter((r) => r.skipped).length,
    batchLimit: Math.min(
      Math.max(requestedLimit, 1),
      IRONLEADS_RESEARCH_BATCH_MAX,
    ),
    activeQueue: selected.activeQueue,
    cooledDown: selected.cooledDown,
    remaining: selected.eligibleRemainingAfterBatch,
    hasMore: selected.eligibleRemainingAfterBatch > 0,
    results,
  };
}
