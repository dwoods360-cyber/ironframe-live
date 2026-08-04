/**
 * Deterministic extractors for buying-committee OSINT (no LLM).
 * Used by Ironleads SUSPECT research — emails/phones stay published vs pattern_guess.
 */

export type BuyingRole =
  | "CISO"
  | "CEO"
  | "CFO"
  | "CRO"
  | "CCO"
  | "GC"
  | "VP_COMPLIANCE"
  | "MANAGING_DIRECTOR"
  | "GRC_PRACTICE_LEAD"
  | "DIRECTOR_OPS";

export type ExtractedPerson = {
  role: BuyingRole;
  fullName: string;
  title: string;
  confidence: number;
};

const ROLE_PATTERNS: Array<{ role: BuyingRole; title: RegExp; weight: number }> = [
  {
    role: "CISO",
    title:
      /\b(?:chief information security officer|chief information\s*security officer|\bciso\b)\b/i,
    weight: 100,
  },
  {
    role: "CEO",
    title:
      /\b(?:chief executive officer|ceo|president and chief executive|chairman[, ]+president and chief executive|co[- ]?founder|founder)\b/i,
    weight: 95,
  },
  {
    role: "CFO",
    title: /\b(?:chief financial officer|\bcfo\b)\b/i,
    weight: 90,
  },
  {
    role: "CRO",
    title: /\b(?:chief risk officer|\bcro\b)\b/i,
    weight: 85,
  },
  {
    role: "CCO",
    title: /\b(?:chief compliance officer|\bcco\b)\b/i,
    weight: 85,
  },
  {
    role: "GC",
    title: /\b(?:general counsel|chief legal officer)\b/i,
    weight: 80,
  },
  {
    role: "VP_COMPLIANCE",
    title: /\b(?:vp|vice president)[, ]+(?:of )?compliance\b/i,
    weight: 75,
  },
  {
    role: "MANAGING_DIRECTOR",
    title:
      /\b(?:lead\s+)?managing\s+director\b|\bmanaging\s+partner\b|\bmanaging\s+director[, ]+cybersecurity\b/i,
    weight: 88,
  },
  {
    role: "GRC_PRACTICE_LEAD",
    title:
      /\bgrc\s+practice\s+lead\b|\b(?:head|director|lead)\s+of\s+grc\b|\bv?ciso\s+practice\s+lead\b/i,
    weight: 82,
  },
  {
    role: "DIRECTOR_OPS",
    title: /\bdirector\s+of\s+operations\b|\bchief\s+operating\s+officer\b|\bcoo\b/i,
    weight: 70,
  },
];

// Keep ASCII A-Z anchors; extraction regexes intentionally omit the `i` flag so
// lowercase prose ("guides", "has") cannot be swallowed into person names.
const NAME_TOKEN = "[A-Z][A-Za-z'’-]+";
// First + optional middle initial + last only — avoids swallowing "GRC" from
// "Rich Stever GRC Practice Lead" meet-the-team cards.
const FULL_NAME = `${NAME_TOKEN}(?:\\s+[A-Z]\\.)?(?:\\s+${NAME_TOKEN}){1}`;

/** Strip tags / scripts for regex scanning. */
export function stripHtmlToText(raw: string): string {
  return raw
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, " ")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function orgLabel(domain: string): string {
  const host = domain.replace(/^www\./i, "").toLowerCase();
  const parts = host.split(".");
  // westernalliancebank.com / westernalliancebancorporation.com → westernalliance*
  const secondLevel = parts.length >= 2 ? parts[parts.length - 2]! : host;
  return secondLevel.replace(/(bank|bancorp|bancorporation|corp|inc|llc)$/i, "");
}

export function extractPublishedEmails(text: string, accountDomain?: string | null): string[] {
  const matches = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) ?? [];
  const domain = accountDomain?.replace(/^www\./i, "").toLowerCase() ?? null;
  const label = domain ? orgLabel(domain) : null;
  const out = new Set<string>();
  for (const raw of matches) {
    const email = raw.toLowerCase();
    if (email.endsWith(".png") || email.endsWith(".jpg")) continue;
    if (domain) {
      const emailDomain = email.split("@")[1] ?? "";
      const sameHost = emailDomain === domain || emailDomain.endsWith(`.${domain}`);
      const siblingOrg =
        Boolean(label) &&
        label!.length >= 6 &&
        orgLabel(emailDomain).startsWith(label!.slice(0, 8));
      if (!sameHost && !siblingOrg) continue;
    }
    out.add(email);
  }
  return [...out].slice(0, 40);
}

export function extractUsPhones(text: string): string[] {
  const matches =
    text.match(
      /(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)\d{3}[-.\s]?\d{4}\b/g,
    ) ?? [];
  const out = new Set<string>();
  for (const raw of matches) {
    const digits = raw.replace(/\D/g, "");
    if (digits.length === 10) out.add(`+1${digits}`);
    else if (digits.length === 11 && digits.startsWith("1")) out.add(`+${digits}`);
  }
  return [...out].slice(0, 20);
}

/**
 * Infer firstInitial+lastname pattern when ≥2 published emails match it on a domain.
 */
export function inferInitialLastEmailPattern(
  emails: string[],
): { domain: string; pattern: "initial_last" } | null {
  const byDomain = new Map<string, string[]>();
  for (const email of emails) {
    const [local, domain] = email.split("@");
    if (!local || !domain) continue;
    const list = byDomain.get(domain) ?? [];
    list.push(local);
    byDomain.set(domain, list);
  }
  for (const [domain, locals] of byDomain) {
    const initialLast = locals.filter((local) => /^[a-z][a-z]{2,}$/.test(local));
    if (initialLast.length >= 2) {
      return { domain, pattern: "initial_last" };
    }
  }
  return null;
}

export function guessInitialLastEmail(
  fullName: string,
  domain: string,
): string | null {
  const parts = fullName
    .replace(/[^A-Za-z\s'-]/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length < 2) return null;
  const first = parts[0].replace(/[^A-Za-z]/g, "");
  const last = parts[parts.length - 1].replace(/[^A-Za-z]/g, "");
  if (first.length < 1 || last.length < 2) return null;
  return `${first[0]!.toLowerCase()}${last.toLowerCase()}@${domain.toLowerCase()}`;
}

const TITLE_NAME_TAIL =
  /^(Lead|Managing|Chief|Director|Practice|Senior|Junior|Global|Vice|President|Officer|Head|Partner|Principal|Associate)$/i;

/** Strip common leadership-page chrome before name validation. */
export function normalizeExtractedPersonName(name: string): string {
  let parts = name
    .replace(/\s+/g, " ")
    .replace(/^(View Bio|Bio|About|Meet)\s+/i, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  // "John Verry Lead" from "John Verry Lead Managing Director" cards
  while (parts.length > 2 && TITLE_NAME_TAIL.test(parts[parts.length - 1]!)) {
    parts = parts.slice(0, -1);
  }
  return parts.join(" ");
}

/**
 * Product / UI / job-title tokens that regex often latches onto as a "person"
 * (e.g. "Scorecard Free CISO", "Readiness Tool CEO", "IT Manager CFO").
 */
const PERSON_NAME_NOISE =
  /\b(and|board|company|best|officer|chief|president|western|alliance|department|united|appoints|director|award|extel|privacy|compliance|secure|applications|view|bio|meet|security|services|solutions|systems|partners|point|scorecard|readiness|tool|free|manager|audit|platform|portal|dashboard|assessment|software|product|demo|trial|download|login|signup|contact|support|team|staff|expert|specialist|consultant|analyst|engineer|administrator|framework|governance|risk|control|evidence|portfolio|client|clients|customer|customers|enterprise|managed|virtual|cloud|cyber|hipaa|cmmc|soc|nist|iso|grc|mssp|vciso|it|phishing|simulation|knowledge|center|newsletter|webinar|resource|library|insights|blog|press|guide|overview|features|pricing|us|your|our|adviser|advisor|global|learn|more|click|here|about|home|news|careers|terms|cookie|subscribe|follow|share|email|phone|address|office|hours|menu|nav|footer|header|copyright|rights|reserved|back|next|previous|skip|content|page|site|web|www|national|defense|defence|homeland|founder|future|before|practice|advisory|incident|response|dameon|jeremy|soarin)\b/i;

/** Reject HTML/award/product-UI noise that regex can latch onto as a "person". */
export function isPlausiblePersonName(name: string): boolean {
  const trimmed = normalizeExtractedPersonName(name);
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length < 2 || parts.length > 4) return false;
  // All-caps marketing phrases ("PRIVACY COMPLIANCE…") are not people.
  if (trimmed === trimmed.toUpperCase() && trimmed.length > 8) return false;
  if (/['’]s$/i.test(parts[parts.length - 1]!)) return false;
  if (/^(As|The|And|For|With|Our|This|Us|Your|Meet|Learn|Contact|About)\b/i.test(trimmed)) {
    return false;
  }
  if (PERSON_NAME_NOISE.test(trimmed)) return false;
  // Reject bare acronyms / all-caps tokens that are not middle initials ("IT", "CEO").
  for (const part of parts) {
    if (/^[A-Z]\.$/.test(part)) continue;
    if (/^[A-Z]{2,}$/.test(part)) return false;
    if (!/^[A-Z][a-zA-Z'’-]+$/.test(part)) return false;
  }
  return true;
}

/**
 * Expand title regex source so CEO/CISO match regardless of case, without `i` on names.
 * Preserves regex escapes (`\b`, `\s`, …) — never fold the `b` in `\b`.
 */
function entryTitleSourceCaseInsensitive(title: RegExp): string {
  return title.source.replace(/\\.|[a-zA-Z]+/g, (chunk) => {
    if (chunk.startsWith("\\")) return chunk;
    return chunk
      .split("")
      .map((ch) => {
        const lower = ch.toLowerCase();
        const upper = ch.toUpperCase();
        if (lower === upper) return ch;
        return `[${lower}${upper}]`;
      })
      .join("");
  });
}

export function extractBuyingPersons(text: string): ExtractedPerson[] {
  const cleaned = text.replace(/\s+/g, " ");
  const found: ExtractedPerson[] = [];

  for (const entry of ROLE_PATTERNS) {
    // Case-folded titles; names stay case-sensitive (`g` only — not `i`).
    // Group title so `|` alternation cannot escape the surrounding pattern.
    const title = `(?:${entryTitleSourceCaseInsensitive(entry.title)})`;
    const patterns = [
      // "Appoints Stephen McMaster as Chief Information Security Officer"
      new RegExp(
        `\\b[Aa]ppoints\\s+(${FULL_NAME})\\s+[Aa]s\\s+(?:[Tt]he\\s+)?${title}`,
        "g",
      ),
      // "Stephen McMaster as Chief Information Security Officer"
      new RegExp(
        `\\b(${FULL_NAME})\\b(?:\\s*[,:\\-–—]|\\s+[Aa]s\\s+|\\s+[Hh]as\\s+[Bb]een\\s+[Aa]ppointed\\s+[Aa]s\\s+|\\s+[Ii]s\\s+)(?:[Tt]he\\s+)?${title}`,
        "g",
      ),
      // "Kenneth A. Vecchione is Chairman, President and Chief Executive Officer"
      new RegExp(`\\b(${FULL_NAME})\\s+[Ii]s\\s+(?:[Tt]he\\s+)?${title}`, "g"),
      // Meet-the-team cards: "John Verry Lead Managing Director" (before title-first — safer)
      new RegExp(`\\b(${FULL_NAME})\\s+${title}`, "g"),
      // Bio lines: "Richard Rebetti has been … Chief Operating Officer"
      new RegExp(
        `\\b(${FULL_NAME})\\s+[Hh]as\\s+[Bb]een\\b[^.!?]{0,120}?${title}`,
        "g",
      ),
      // Title before name: "Chief Information Security Officer Stephen McMaster"
      new RegExp(`${title}\\s*[,:\\-–—]?\\s*(${FULL_NAME})\\b`, "g"),
    ];

    for (const rx of patterns) {
      rx.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = rx.exec(cleaned)) !== null) {
        const fullName = normalizeExtractedPersonName(match[1] ?? "");
        if (!isPlausiblePersonName(fullName)) continue;
        found.push({
          role: entry.role,
          fullName,
          title: match[0].slice(0, 160),
          confidence: entry.weight,
        });
      }
    }
  }

  const matchQuality = (person: ExtractedPerson): number => {
    const title = person.title.toLowerCase();
    const name = person.fullName.toLowerCase();
    // Prefer "Name Title" cards and appointment/bio prose over risky title-first mashups.
    if (title.startsWith(name)) return 3;
    if (/\bappoints\b/.test(title) || /\bhas been\b/.test(title) || /\bis\b/.test(title))
      return 2;
    return 1;
  };

  const best = new Map<BuyingRole, ExtractedPerson>();
  for (const person of found) {
    const prev = best.get(person.role);
    if (
      !prev ||
      person.confidence > prev.confidence ||
      (person.confidence === prev.confidence && matchQuality(person) > matchQuality(prev))
    ) {
      best.set(person.role, person);
    }
  }
  return [...best.values()].sort((a, b) => b.confidence - a.confidence);
}

export const RESEARCH_PATHS = [
  "/contact-us",
  "/contact",
  "/about",
  "/about-us",
  "/our-leadership",
  "/leadership",
  "/team",
  "/meet-the-team",
  "/meet-our-team",
  "/our-team",
  "/people",
  "/company",
  "/company/meet-the-team",
  "/company/team",
  "/company/leadership",
  "/about/team",
  "/about/leadership",
  "/about/meet-the-team",
  "/news",
  "/insights",
  "/press",
  "/careers",
] as const;

const TEAM_PATH_HINT =
  /(?:meet[-_]?the[-_]?team|meet[-_]?our[-_]?team|our[-_]?team|our[-_]?leadership|leadership|\/team(?:\/|$)|\/people(?:\/|$)|\/staff(?:\/|$))/i;

/**
 * Discover same-origin Meet the Team / Leadership URLs from homepage (or any) HTML.
 * Example: https://www.pivotpointsecurity.com/company/meet-the-team/
 */
export function extractSameOriginTeamPageUrls(
  html: string,
  websiteBaseUrl: string,
): string[] {
  let origin: string;
  try {
    origin = new URL(websiteBaseUrl).origin;
  } catch {
    return [];
  }

  const found = new Set<string>();
  const hrefRe = /href\s*=\s*["']([^"'#]+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = hrefRe.exec(html)) !== null) {
    const raw = m[1].trim();
    if (!raw || raw.startsWith("mailto:") || raw.startsWith("tel:")) continue;
    let absolute: URL;
    try {
      absolute = new URL(raw, origin);
    } catch {
      continue;
    }
    if (absolute.origin !== origin) continue;
    if (!TEAM_PATH_HINT.test(absolute.pathname)) continue;
    const normalized = `${absolute.origin}${absolute.pathname}`.replace(/\/$/, "");
    if (normalized === origin) continue;
    found.add(normalized);
  }
  return [...found].slice(0, 8);
}

export type PublicSocialNetwork = "linkedin" | "youtube" | "facebook";

export type PublicSocialLink = {
  network: PublicSocialNetwork;
  url: string;
  /** company_page | person_profile | channel | unknown */
  kind: "company_page" | "person_profile" | "channel" | "unknown";
  /** true = safe to fetch HTML; LinkedIn profiles are link-only (no scrape). */
  fetchable: boolean;
  note: string;
};

/**
 * Pull public LinkedIn / YouTube / Facebook URLs from company HTML.
 * LinkedIn person/company links are recorded for operator review — never scraped.
 */
export function extractPublicSocialLinks(htmlOrText: string): PublicSocialLink[] {
  const found = new Map<string, PublicSocialLink>();

  const consider = (rawUrl: string) => {
    let parsed: URL;
    try {
      parsed = new URL(rawUrl.replace(/&amp;/g, "&"));
    } catch {
      return;
    }
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return;
    const host = parsed.hostname.replace(/^www\./i, "").toLowerCase();
    const path = parsed.pathname.replace(/\/$/, "") || "/";
    const href = `${parsed.origin}${parsed.pathname}`.replace(/\/$/, "");

    if (host === "linkedin.com" || host.endsWith(".linkedin.com")) {
      if (/^\/in\//i.test(path)) {
        found.set(href.toLowerCase(), {
          network: "linkedin",
          url: href,
          kind: "person_profile",
          fetchable: false,
          note: "Public LinkedIn profile link from company site — open manually; do not scrape.",
        });
        return;
      }
      if (/^\/company\//i.test(path) || /^\/school\//i.test(path)) {
        found.set(href.toLowerCase(), {
          network: "linkedin",
          url: href,
          kind: "company_page",
          fetchable: false,
          note: "Company LinkedIn page link — operator review only (LinkedIn ToS: no automated scrape).",
        });
      }
      return;
    }

    if (
      host === "youtube.com" ||
      host === "m.youtube.com" ||
      host === "youtu.be" ||
      host.endsWith(".youtube.com")
    ) {
      const isChannel =
        /^\/(channel|c|user|@)/i.test(path) || host === "youtu.be";
      found.set(href.toLowerCase(), {
        network: "youtube",
        url: href,
        kind: isChannel ? "channel" : "unknown",
        fetchable: Boolean(isChannel && !/^\/watch/i.test(path)),
        note: isChannel
          ? "Public YouTube channel — About/description may be fetched."
          : "YouTube link from company site.",
      });
      return;
    }

    if (
      host === "facebook.com" ||
      host === "m.facebook.com" ||
      host === "fb.com" ||
      host.endsWith(".facebook.com")
    ) {
      if (/^\/(privacy|help|login|watch|reel|groups)\b/i.test(path)) return;
      found.set(href.toLowerCase(), {
        network: "facebook",
        url: href,
        kind: "company_page",
        fetchable: true,
        note: "Public Facebook Page — About text may be fetched when available.",
      });
    }
  };

  // Prefer href="..." from HTML, then bare URLs in stripped text.
  const hrefRe =
    /href\s*=\s*["'](https?:\/\/(?:www\.)?(?:linkedin\.com|youtube\.com|youtu\.be|facebook\.com|fb\.com|m\.facebook\.com|m\.youtube\.com)[^"'#?\s]*)/gi;
  let m: RegExpExecArray | null;
  while ((m = hrefRe.exec(htmlOrText)) !== null) {
    consider(m[1]);
  }
  const bareRe =
    /https?:\/\/(?:www\.)?(?:linkedin\.com|youtube\.com|youtu\.be|facebook\.com|fb\.com)\/[^\s"'<>)]+/gi;
  while ((m = bareRe.exec(htmlOrText)) !== null) {
    consider(m[0].replace(/[.,;]+$/, ""));
  }

  return [...found.values()].slice(0, 16);
}

/** Best-effort public About URL for YouTube / Facebook (never LinkedIn). */
export function socialAboutFetchUrl(link: PublicSocialLink): string | null {
  if (!link.fetchable) return null;
  if (link.network === "youtube") {
    if (/\/about\/?$/i.test(link.url)) return link.url;
    return `${link.url.replace(/\/$/, "")}/about`;
  }
  if (link.network === "facebook") {
    if (/\/about\/?/i.test(link.url)) return link.url;
    return `${link.url.replace(/\/$/, "")}/about`;
  }
  return null;
}

/** Loose heuristic for OSINT article titles / agency pages ingested as company names. */
export function looksLikeOsintTitleNoise(company: string): boolean {
  const name = company.trim();
  if (name.length < 4) return true;
  if (/^(bod|cve|u\.?s\.?\s+department|department of)\b/i.test(name)) return true;
  // Article-style OSINT titles — do NOT treat firm names like "Ruleset GRC Advisory" as noise.
  if (/\b(prioritizing|remediation|bulletin)\b/i.test(name)) return true;
  if (
    /\badvisory\b/i.test(name) &&
    (/\b(cisa|msrc|bod|cve|security updates?|based on risk)\b/i.test(name) || name.length > 48)
  ) {
    return true;
  }
  if (/^chief information security$/i.test(name)) return true;
  // Marketing / nav keyword piles mistaken for person names (e.g. "PRIVACY COMPLIANCE SECURE APPLICATIONS").
  if (
    /^[A-Z0-9][A-Z0-9\s/&-]{8,}$/.test(name) &&
    /\b(privacy|compliance|secure|applications?|solutions?|services?|products?)\b/i.test(name) &&
    !/\b(inc|llc|ltd|corp|security|bank|health|energy)\b/i.test(name)
  ) {
    return true;
  }
  return false;
}
