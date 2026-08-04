import "server-only";

import type { Prisma } from "@prisma/client";

import { buildAccountResearchBrief, mergeNamedBuyerIntoBriefMembers } from "@/app/lib/server/ironleadsAccountResearchBrief";
import {
  extractBuyingPersons,
  extractPublishedEmails,
  extractPublicSocialLinks,
  extractSameOriginTeamPageUrls,
  extractUsPhones,
  guessInitialLastEmail,
  inferInitialLastEmailPattern,
  isPlausiblePersonName,
  looksLikeOsintTitleNoise,
  RESEARCH_PATHS,
  socialAboutFetchUrl,
  stripHtmlToText,
  type BuyingRole,
  type PublicSocialLink,
} from "@/app/lib/server/ironleadsBuyingCommitteeExtract";
import { normalizeAccountDomain } from "@/app/lib/ingress/ironleadsSuspectIdentity";
import {
  checkMailboxHygieneMany,
  mailboxHygieneLabel,
  type MailboxHygieneResult,
} from "@/app/lib/server/emailMailboxHygiene";
import { scoreSuspectReadiness } from "@/app/lib/ironleadsSuspectReadiness";
import { isOperatorHoldArchived } from "@/app/lib/server/ironleadsOperatorHoldCore";
import {
  websiteUrlFromDomainOrUrl,
} from "@/app/lib/server/ironleadsSuspectLocation";
import { probeCompanyWebsite } from "@/app/lib/server/ironleadsWebsiteProbeCore";
import prisma from "@/lib/prisma";

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
  pagesFetched: number;
  socialProfiles: PublicSocialLink[];
  socialPagesFetched: number;
  researchedAt: string;
};

type ContactRow = {
  id: string;
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
        "User-Agent": "Ironleads-BuyingCommittee/1.0 (+https://ironframegrc.com)",
        Accept: "text/html,application/xhtml+xml,text/plain,*/*",
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

function buildMembers(input: {
  people: ReturnType<typeof extractBuyingPersons>;
  emails: string[];
  phones: string[];
  sourceUrls: string[];
  accountDomain: string | null;
}): BuyingCommitteeMember[] {
  const pattern = inferInitialLastEmailPattern(input.emails);
  const guessDomain =
    pattern?.domain ??
    input.accountDomain?.replace(/^www\./i, "").toLowerCase() ??
    null;

  return input.people.map((person) => {
    const emails: BuyingCommitteeEmail[] = [];
    const publishedForPerson = input.emails.filter((email) => {
      const local = email.split("@")[0] ?? "";
      const last = person.fullName.split(/\s+/).pop()?.toLowerCase() ?? "";
      return last.length >= 3 && local.includes(last);
    });
    for (const email of publishedForPerson.slice(0, 2)) {
      emails.push({ email, status: "published", source: "company_website" });
    }
    if (emails.length === 0 && guessDomain) {
      const guess = guessInitialLastEmail(person.fullName, guessDomain);
      if (guess) {
        emails.push({
          email: guess,
          status: "pattern_guess",
          source: pattern
            ? `inferred_initial_last@${guessDomain}`
            : `assumed_initial_last@${guessDomain}`,
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
          ? "Email is a pattern guess until published on a company page or confirmed by reply."
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
  const contact = await prisma.ironboardCrmContact.findUnique({
    where: { id: contactId },
    select: {
      id: true,
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
  });
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
    const emails = [
      ...extractPublishedEmails(corpus, accountDomain),
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

    // Prefer curated public appointments when live HTML parse is thin or noisy.
    const playbookMembers = playbook?.members ?? [];
    const mergedByRole = new Map<BuyingRole, BuyingCommitteeMember>();
    for (const member of playbookMembers) mergedByRole.set(member.role, member);
    for (const member of liveMembers) {
      if (!member.fullName || !isPlausiblePersonName(member.fullName)) continue;
      const prior = mergedByRole.get(member.role);
      if (
        !prior ||
        (member.emails.some((e) => e.status === "published") &&
          prior.emails.every((e) => e.status !== "published"))
      ) {
        mergedByRole.set(member.role, member);
      }
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
      pagesFetched: pages.length,
      socialProfiles,
      socialPagesFetched: socialPages.length,
      researchedAt,
    };
  }

  if (result.members.length > 0) {
    result = {
      ...result,
      members: await attachMailboxHygiene(result.members),
    };
  }

  const corpus =
    pages.length || socialPages.length
      ? [...pages.map((p) => p.text), ...socialPages.map((p) => p.text)].join(" \n ")
      : "";
  const sourceUrls = [
    ...pages.map((p) => p.url),
    ...socialPages.map((p) => p.url),
    ...result.members.flatMap((m) => m.sourceUrls),
  ];

  await persistResearch(contact, result, { corpus, sourceUrls });
  return result;
}

async function persistResearch(
  contact: ContactRow,
  result: BuyingCommitteeResearchResult,
  evidence: { corpus: string; sourceUrls: string[] },
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
    hasPhone,
    generatedAt: result.researchedAt,
  });

  if (result.skipped && result.members.length === 0) {
    const prior = asRecord(contact.metadata) ?? {};
    await prisma.ironboardCrmContact.update({
      where: { id: contact.id },
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
    });
    return;
  }

  const prior = asRecord(contact.metadata) ?? {};
  const ciso = result.members.find(
    (m) => m.role === "CISO" && m.fullName && isPlausiblePersonName(m.fullName),
  );
  const ceo = result.members.find(
    (m) => m.role === "CEO" && m.fullName && isPlausiblePersonName(m.fullName),
  );
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

  const namedBuyer = ciso?.fullName
    ? {
        fullName: ciso.fullName,
        title: ciso.title ?? "Chief Information Security Officer",
        location: null,
        trigger: "NEW_CISO",
        announcedAt: null,
        sourceUrls: ciso.sourceUrls,
        note: ciso.note,
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
      switchboardPhones: result.switchboardPhones,
      members: result.members,
      socialProfiles: result.socialProfiles,
      socialPagesFetched: result.socialPagesFetched,
    },
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

  await prisma.ironboardCrmContact.update({
    where: { id: contact.id },
    data: {
      phone: nextPhone,
      metadata: metadata as Prisma.InputJsonValue,
      ...(ciso?.fullName && isPlausiblePersonName(ciso.fullName)
        ? {
            fullName: ciso.fullName,
            title: "Chief Information Security Officer",
          }
        : // Wipe contact label when prior research wrote product/UI junk as "fullName".
          contact.fullName && !isPlausiblePersonName(contact.fullName)
          ? {
              fullName: `${contact.company} — buyer TBD`,
              title: null,
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
    await prisma.ironboardCrmDeal.update({
      where: { id: deal.id },
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
}

export async function researchBuyingCommitteeForAllSuspects(): Promise<{
  researchedAt: string;
  total: number;
  researched: number;
  skipped: number;
  results: BuyingCommitteeResearchResult[];
}> {
  const suspectsRaw = await prisma.ironboardCrmContact.findMany({
    where: { primaryDeals: { some: { stage: "SUSPECT" } } },
    orderBy: [{ createdAt: "desc" }, { priorityScore: "desc" }],
    take: 80,
    select: {
      id: true,
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
  });

  // Active only — prefer thinnest dossiers so Research fills gaps (queue UI sorts richest first).
  const suspects = suspectsRaw
    .filter((row) => !isOperatorHoldArchived(row.metadata))
    .sort((a, b) => {
      const sa = scoreSuspectReadiness({
        metadata: a.metadata,
        accountDomain: a.primaryDeals[0]?.accountDomain ?? null,
      }).score;
      const sb = scoreSuspectReadiness({
        metadata: b.metadata,
        accountDomain: b.primaryDeals[0]?.accountDomain ?? null,
      }).score;
      return sa - sb;
    })
    .slice(0, 20);

  const results: BuyingCommitteeResearchResult[] = [];
  for (const contact of suspects) {
    results.push(await researchAndPersist(contact));
  }

  return {
    researchedAt: new Date().toISOString(),
    total: results.length,
    researched: results.filter((r) => !r.skipped).length,
    skipped: results.filter((r) => r.skipped).length,
    results,
  };
}
