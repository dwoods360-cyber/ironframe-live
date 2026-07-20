import "server-only";

import type { Prisma } from "@prisma/client";

import {
  extractBuyingPersons,
  extractPublishedEmails,
  extractUsPhones,
  guessInitialLastEmail,
  inferInitialLastEmailPattern,
  isPlausiblePersonName,
  looksLikeOsintTitleNoise,
  RESEARCH_PATHS,
  stripHtmlToText,
  type BuyingRole,
} from "@/app/lib/server/ironleadsBuyingCommitteeExtract";
import {
  websiteUrlFromDomainOrUrl,
} from "@/app/lib/server/ironleadsSuspectLocation";
import prisma from "@/lib/prisma";

export type BuyingCommitteeEmail = {
  email: string;
  status: "published" | "pattern_guess";
  source: string | null;
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
  researchedAt: string;
};

type ContactRow = {
  id: string;
  company: string;
  email: string;
  phone: string | null;
  metadata: unknown;
  primaryDeals: Array<{ id: string; accountDomain: string | null; notes: string }>;
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

async function gatherCompanyPages(websiteUrl: string): Promise<Array<{ url: string; text: string }>> {
  const base = websiteUrl.replace(/\/$/, "");
  const urls = [base, ...RESEARCH_PATHS.map((path) => `${base}${path}`)];
  const pages: Array<{ url: string; text: string }> = [];
  for (const url of urls) {
    const raw = await fetchText(url);
    if (!raw || raw.length < 80) continue;
    pages.push({ url, text: stripHtmlToText(raw) });
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
      const already = rows.some((row) => {
        const r = asRecord(row);
        return r && String(r.email).toLowerCase() === email.email;
      });
      if (already) continue;
      rows.push({
        person: member.fullName,
        role: member.role,
        email: email.email,
        confidence: email.status,
        status: email.status === "published" ? "published" : "unverified",
        note: member.note,
      });
    }
  }
  return rows.slice(0, 24) as Array<Record<string, unknown>>;
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
      metadata: true,
      primaryDeals: {
        where: { stage: "SUSPECT" },
        orderBy: { updatedAt: "desc" },
        take: 1,
        select: { id: true, accountDomain: true, notes: true },
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
      researchedAt,
    };
  }

  const websiteUrl = resolveWebsiteBase(contact.metadata, accountDomain);
  let pages: Array<{ url: string; text: string }> = [];
  if (websiteUrl) {
    pages = await gatherCompanyPages(websiteUrl);
  }

  const playbook = curatedPlaybook(contact.company);
  let result: BuyingCommitteeResearchResult;

  if (pages.length === 0) {
    if (playbook) {
      result = { ...playbook, contactId: contact.id };
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
        researchedAt,
      };
    }
  } else {
    const corpus = pages.map((p) => p.text).join(" \n ");
    const sourceUrls = pages.map((p) => p.url);
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
      if (!prior || (member.emails.some((e) => e.status === "published") && prior.emails.every((e) => e.status !== "published"))) {
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
      researchedAt,
    };
  }

  await persistResearch(contact, result);
  return result;
}

async function persistResearch(
  contact: ContactRow,
  result: BuyingCommitteeResearchResult,
): Promise<void> {
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
          },
        } as Prisma.InputJsonValue,
      },
    });
    return;
  }

  const prior = asRecord(contact.metadata) ?? {};
  const ciso = result.members.find((m) => m.role === "CISO");
  const ceo = result.members.find((m) => m.role === "CEO");
  const switchboard = result.switchboardPhones[0]?.phone ?? null;

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
    : prior.namedBuyer;

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
    : prior.executiveSponsor;

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
    },
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
      ...(ciso?.fullName
        ? {
            fullName: ciso.fullName,
            title: "Chief Information Security Officer",
          }
        : {}),
    },
  });

  const deal = contact.primaryDeals[0];
  if (deal) {
    await prisma.ironboardCrmDeal.update({
      where: { id: deal.id },
      data: {
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
  const suspects = await prisma.ironboardCrmContact.findMany({
    where: { primaryDeals: { some: { stage: "SUSPECT" } } },
    orderBy: [{ priorityScore: "desc" }, { createdAt: "desc" }],
    take: 40,
    select: {
      id: true,
      company: true,
      email: true,
      phone: true,
      metadata: true,
      primaryDeals: {
        where: { stage: "SUSPECT" },
        orderBy: { updatedAt: "desc" },
        take: 1,
        select: { id: true, accountDomain: true, notes: true },
      },
    },
  });

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
