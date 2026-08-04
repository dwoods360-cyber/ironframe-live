/**
 * Post-process Brave/SerpAPI leadership hits: drop generic roundups that do not
 * mention the prospect, and turn LinkedIn/Forbes URL slugs into extractable prose.
 */

export type LeadershipHitLike = {
  title: string;
  snippet: string;
  link: string;
};

const COMPANY_STOP = new Set([
  "inc",
  "llc",
  "ltd",
  "corp",
  "corporation",
  "company",
  "companies",
  "the",
  "and",
  "of",
  "for",
  "group",
  "services",
  "solutions",
  "consulting",
  "security",
  "cyber",
  "it",
  "managed",
]);

const GENERIC_LEADERSHIP_URL =
  /(?:new[-_]?ciso[-_]?appointments(?:[-_]?\d{4})?|ciso[-_]?appointments[-_]?\d{4}|\/wiki\/chief_information_security_officer|\/wiki\/chief_executive_officer)(?:\/|$|\?|#)/i;

const ROLE_SLUG_SPLIT =
  /-(?:co-?founder|founder|ceo|cfo|cto|ciso|coo|president|chairman|chief|director|vp|head)-/i;

export function companySearchTokens(company: string): string[] {
  return company
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 3 && !COMPANY_STOP.has(t));
}

export function leadershipHitMentionsCompany(
  hit: LeadershipHitLike,
  company: string,
): boolean {
  const hay = `${hit.title} ${hit.snippet} ${hit.link}`.toLowerCase();
  const normalizedCompany = company
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  if (normalizedCompany.length >= 4 && hay.includes(normalizedCompany)) return true;

  const tokens = companySearchTokens(company);
  if (tokens.length === 0) return false;
  if (tokens.length === 1) return hay.includes(tokens[0]!);

  const matched = tokens.filter((t) => hay.includes(t)).length;
  // Multi-token firms: require the longest token or 2+ tokens.
  const longest = [...tokens].sort((a, b) => b.length - a.length)[0]!;
  return matched >= 2 || (longest.length >= 5 && hay.includes(longest));
}

export function isGenericLeadershipNoiseUrl(url: string): boolean {
  return GENERIC_LEADERSHIP_URL.test(url);
}

function titleCaseToken(token: string): string {
  if (!token) return token;
  return token.charAt(0).toUpperCase() + token.slice(1).toLowerCase();
}

/** LinkedIn /in/christa-heibel-48b31a20/ → "Christa Heibel" */
export function personNameFromLinkedInSlug(url: string): string | null {
  try {
    const path = new URL(url).pathname;
    const m = path.match(/\/in\/([a-z0-9][a-z0-9-]{1,80})\/?/i);
    if (!m?.[1]) return null;
    let slug = m[1].toLowerCase();
    slug = slug.replace(/-[a-z0-9]{5,14}$/i, ""); // trailing vanity id
    const parts = slug.split("-").filter((p) => p.length >= 2 && !/^\d+$/.test(p));
    if (parts.length < 2 || parts.length > 4) return null;
    if (parts.some((p) => p.length > 18)) return null;
    return parts.map(titleCaseToken).join(" ");
  } catch {
    return null;
  }
}

/**
 * Forbes Councils style:
 * /profile/Rathinasabapathy-Arumugam-Co-Founder-CTO-CoreStack/...
 */
export function personAndRoleFromForbesProfileSlug(url: string): {
  fullName: string;
  rolePhrase: string;
} | null {
  try {
    const path = new URL(url).pathname;
    const m = path.match(/\/profile\/([^/]+)\/?/i);
    if (!m?.[1]) return null;
    const slug = decodeURIComponent(m[1]);
    const split = slug.search(ROLE_SLUG_SPLIT);
    if (split <= 0) return null;
    const namePart = slug.slice(0, split);
    const rolePart = slug.slice(split + 1);
    const nameTokens = namePart.split("-").filter(Boolean);
    if (nameTokens.length < 2 || nameTokens.length > 4) return null;
    const fullName = nameTokens.map(titleCaseToken).join(" ");
    const roleLower = rolePart.toLowerCase();
    let rolePhrase = "Chief Executive Officer";
    if (/\bciso\b|chief-information-security/.test(roleLower)) {
      rolePhrase = "Chief Information Security Officer";
    } else if (/\bcfo\b|chief-financial/.test(roleLower)) {
      rolePhrase = "Chief Financial Officer";
    } else if (/\bcto\b|chief-technology|co-?founder|founder/.test(roleLower)) {
      rolePhrase = "Co-Founder";
    } else if (/\bmanaging-director\b/.test(roleLower)) {
      rolePhrase = "Managing Director";
    }
    return { fullName, rolePhrase };
  } catch {
    return null;
  }
}

export function enrichLeadershipCorpusLine(
  hit: LeadershipHitLike,
  company: string,
): string | null {
  if (!leadershipHitMentionsCompany(hit, company) && !hit.link.includes("linkedin.com/in/")) {
    return null;
  }

  const forbes = personAndRoleFromForbesProfileSlug(hit.link);
  if (forbes) {
    return `${forbes.fullName} is ${forbes.rolePhrase} at ${company}.`;
  }

  const linkedIn = personNameFromLinkedInSlug(hit.link);
  if (linkedIn && leadershipHitMentionsCompany(hit, company)) {
    // Solo consultancies often match the founder's name; use CEO as buyer seat.
    return `${linkedIn} is Chief Executive Officer at ${company}.`;
  }

  // LinkedIn slug overlaps company tokens (Amy Bittle ↔ amy-bittle / amylbiddle soft).
  if (linkedIn) {
    const tokens = companySearchTokens(company);
    const slugHay = hit.link.toLowerCase();
    const overlap = tokens.filter((t) => slugHay.includes(t)).length;
    if (overlap >= 1 && tokens.some((t) => t.length >= 4 && slugHay.includes(t))) {
      return `${linkedIn} is Chief Executive Officer at ${company}.`;
    }
  }

  return null;
}

export function refineLeadershipHits(
  company: string,
  rawHits: LeadershipHitLike[],
): { hits: LeadershipHitLike[]; corpus: string } {
  const hits = rawHits.filter((h) => {
    if (!h.link) return false;
    if (!h.title && !h.snippet) return false;
    const mentions = leadershipHitMentionsCompany(h, company);
    if (isGenericLeadershipNoiseUrl(h.link) && !mentions) return false;
    // Person profiles / firm pages must mention the company (or LinkedIn overlap handled in enrich).
    if (!mentions && !/linkedin\.com\/in\//i.test(h.link)) return false;
    if (!mentions && /linkedin\.com\/in\//i.test(h.link)) {
      const tokens = companySearchTokens(company);
      const slugHay = h.link.toLowerCase();
      return tokens.some((t) => t.length >= 4 && slugHay.includes(t));
    }
    return mentions;
  });

  const prose = hits.map((h) => [h.title, h.snippet].filter(Boolean).join(". "));
  const enriched = hits
    .map((h) => enrichLeadershipCorpusLine(h, company))
    .filter((line): line is string => Boolean(line));

  const corpus = [...prose, ...enriched].filter(Boolean).join(" \n ");
  return { hits, corpus };
}
