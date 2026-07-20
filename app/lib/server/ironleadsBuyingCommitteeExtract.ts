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
  | "VP_COMPLIANCE";

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
      /\b(?:chief executive officer|\bceo\b|president and chief executive|chairman[, ]+president and chief executive)\b/i,
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
];

const NAME_TOKEN = "[A-Z][A-Za-z'’-]+";
const FULL_NAME = `${NAME_TOKEN}(?:\\s+[A-Z]\\.)?(?:\\s+${NAME_TOKEN}){1,3}`;

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

/** Strip common leadership-page chrome before name validation. */
export function normalizeExtractedPersonName(name: string): string {
  return name
    .replace(/\s+/g, " ")
    .replace(/^(View Bio|Bio|About|Meet)\s+/i, "")
    .trim();
}

/** Reject HTML/award noise that regex can latch onto as a "person". */
export function isPlausiblePersonName(name: string): boolean {
  const trimmed = normalizeExtractedPersonName(name);
  const parts = trimmed.split(/\s+/);
  if (parts.length < 2 || parts.length > 4) return false;
  // All-caps marketing phrases ("PRIVACY COMPLIANCE…") are not people.
  if (trimmed === trimmed.toUpperCase() && trimmed.length > 8) return false;
  if (
    /\b(and|board|company|best|officer|chief|president|western|alliance|department|united|appoints|director|award|extel|privacy|compliance|secure|applications|view|bio|meet)\b/i.test(
      trimmed,
    )
  ) {
    return false;
  }
  return parts.every(
    (part) => /^[A-Z][a-zA-Z'’-]+$/.test(part) || /^[A-Z]\.$/.test(part),
  );
}

export function extractBuyingPersons(text: string): ExtractedPerson[] {
  const cleaned = text.replace(/\s+/g, " ");
  const found: ExtractedPerson[] = [];

  for (const entry of ROLE_PATTERNS) {
    const patterns = [
      // "Appoints Stephen McMaster as Chief Information Security Officer"
      new RegExp(
        `\\bAppoints\\s+(${FULL_NAME})\\s+as\\s+(?:the\\s+)?${entry.title.source}`,
        "gi",
      ),
      // "Stephen McMaster as Chief Information Security Officer"
      new RegExp(
        `\\b(${FULL_NAME})\\b(?:\\s*[,:\\-–—]|\\s+as\\s+|\\s+has\\s+been\\s+appointed\\s+as\\s+|\\s+is\\s+)(?:the\\s+)?${entry.title.source}`,
        "gi",
      ),
      // "Kenneth A. Vecchione is Chairman, President and Chief Executive Officer"
      new RegExp(
        `\\b(${FULL_NAME})\\s+is\\s+(?:the\\s+)?${entry.title.source}`,
        "gi",
      ),
      // Title before name: "Chief Information Security Officer Stephen McMaster"
      new RegExp(`${entry.title.source}\\s*[,:\\-–—]?\\s*(${FULL_NAME})\\b`, "gi"),
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

  // Keep best per role.
  const best = new Map<BuyingRole, ExtractedPerson>();
  for (const person of found) {
    const prev = best.get(person.role);
    if (!prev || person.confidence > prev.confidence) best.set(person.role, person);
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
  "/news",
  "/insights",
] as const;

/** Loose heuristic for OSINT article titles / agency pages ingested as company names. */
export function looksLikeOsintTitleNoise(company: string): boolean {
  const name = company.trim();
  if (name.length < 4) return true;
  if (/^(bod|cve|u\.?s\.?\s+department|department of)\b/i.test(name)) return true;
  if (/\b(prioritizing|remediation|advisory|bulletin)\b/i.test(name)) return true;
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
