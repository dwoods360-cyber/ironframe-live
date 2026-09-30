/**
 * Name-only SUSPECTs: guess and recover a company website + US postal HQ
 * from public pages. Never an email send and never a promote.
 */

const GENERIC_BRAND = new Set([
  "the",
  "and",
  "inc",
  "llc",
  "ltd",
  "corp",
  "company",
  "group",
  "global",
  "international",
  "business",
  "services",
  "service",
  "solutions",
  "consulting",
  "technology",
  "technologies",
  "systems",
  "security",
  "cyber",
  "network",
  "networks",
  "managed",
  "partners",
  "partner",
  "communications",
  "communication",
]);

/** Hosts that are evidence, not the company's own site. */
const NOT_COMPANY_SITE = [
  "linkedin.com",
  "zoominfo.com",
  "contactout.com",
  "wikipedia.org",
  "wikidata.org",
  "rocketreach.co",
  "crunchbase.com",
  "facebook.com",
  "instagram.com",
  "twitter.com",
  "x.com",
  "youtube.com",
  "glassdoor.com",
  "indeed.com",
  "apollo.io",
  "hunter.io",
  "google.com",
  "bing.com",
  "yahoo.com",
];

export type DiscoveredPostalAddress = {
  street: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  country: string | null;
};

export function companyNameTokens(company: string): string[] {
  return company
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 3 && !GENERIC_BRAND.has(t))
    .slice(0, 4);
}

/**
 * Distinctive short brand (TPx → tpx.com, TechMagic → techmagic.com).
 * Multi-word names only qualify when a token has an inner capital or a digit,
 * so "Red River" does not probe red.com or river.com.
 */
export function shortBrandLabel(company: string): string | null {
  const raw = company
    .replace(/\b(inc|llc|ltd|corp|corporation|company|co|plc|lp|llp)\b\.?/gi, " ")
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .filter((token) => !GENERIC_BRAND.has(token.toLowerCase()));
  if (raw.length === 0) return null;
  const branded = raw.find(
    (token) => /[A-Z]/.test(token.slice(1)) || /\d/.test(token),
  );
  if (branded) {
    const label = branded.toLowerCase();
    if (label.length >= 3 && label.length <= 12) return label;
  }
  if (raw.length === 1) {
    const label = raw[0]!.toLowerCase();
    if (label.length >= 4 && label.length <= 12) return label;
  }
  return null;
}

/** Short brand first (tpx.com), then compacted name slugs. */
export function buildCompanyWebsiteProbeUrls(company: string): string[] {
  const urls: string[] = [];
  const seen = new Set<string>();
  const push = (url: string) => {
    const key = url.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    urls.push(url);
  };

  const brand = shortBrandLabel(company);
  if (brand) {
    push(`https://${brand}.com`);
    push(`https://www.${brand}.com`);
  }

  const base = company
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/\b(inc|llc|ltd|corp|corporation|company|co|plc|lp|llp)\b\.?/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  const compact = base.replace(/\s+/g, "");
  const dashed = base.replace(/\s+/g, "-");
  const slugs = [compact, dashed].filter((s) => s.length >= 3);
  const tlds = ["com", "io", "co", "net", "us"];
  for (const slug of slugs.slice(0, 3)) {
    for (const tld of tlds) {
      push(`https://www.${slug}.${tld}`);
      push(`https://${slug}.${tld}`);
    }
  }
  return urls.slice(0, 20);
}

function hostOf(raw: string): string | null {
  try {
    const withProto = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    return new URL(withProto).hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return null;
  }
}

function isDirectoryHost(host: string): boolean {
  return NOT_COMPANY_SITE.some((h) => host === h || host.endsWith(`.${h}`));
}

function registrableLabel(host: string): string {
  const parts = host.split(".").filter(Boolean);
  if (parts.length < 2) return host;
  return parts[parts.length - 2] ?? host;
}

export function isPlausibleCompanySite(company: string, rawUrl: string): boolean {
  const host = hostOf(rawUrl);
  if (!host || isDirectoryHost(host)) return false;
  const label = registrableLabel(host);
  const tokens = companyNameTokens(company);
  if (tokens.length === 0) return false;
  return tokens.some((t) => label === t || label.startsWith(t) || label.includes(t));
}

export function normalizeCompanyWebsite(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim().replace(/[),.;]+$/, "");
  if (!trimmed) return null;
  try {
    const withProto = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const url = new URL(withProto);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    url.hash = "";
    url.search = "";
    return url.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

/** Wikipedia / about-page "official website" plus brand-matching hit URLs. */
export function pickOfficialWebsite(input: {
  company: string;
  urls?: string[];
  htmlBlobs?: string[];
  textBlobs?: string[];
}): string | null {
  const blobs = [...(input.htmlBlobs ?? []), ...(input.textBlobs ?? [])];
  for (const blob of blobs) {
    const fromHtml = extractOfficialWebsiteMention(blob);
    if (fromHtml && isPlausibleCompanySite(input.company, fromHtml)) return fromHtml;
  }
  for (const raw of input.urls ?? []) {
    if (!isPlausibleCompanySite(input.company, raw)) continue;
    const normalized = normalizeCompanyWebsite(raw);
    if (!normalized) continue;
    try {
      const url = new URL(normalized);
      url.pathname = "/";
      return url.toString().replace(/\/$/, "");
    } catch {
      continue;
    }
  }
  return null;
}

function extractOfficialWebsiteMention(blob: string): string | null {
  const linked = blob.match(
    /(?:official\s+website|website)[\s\S]{0,220}?href="(https?:\/\/[^"]+)"/i,
  );
  if (linked?.[1] && !/wikipedia|linkedin|zoominfo|contactout/i.test(linked[1])) {
    return normalizeCompanyWebsite(linked[1]);
  }
  const labeled = blob.match(
    /(?:official website|website)\s*[:|]?\s*((?:https?:\/\/)?(?:www\.)?[a-z0-9][a-z0-9.-]+\.[a-z]{2,})/i,
  );
  if (labeled?.[1] && !/wikipedia|linkedin|zoominfo|contactout/i.test(labeled[1])) {
    return normalizeCompanyWebsite(labeled[1]);
  }
  return null;
}

const STREET_SUFFIX =
  "Street|St|Avenue|Ave|Boulevard|Blvd|Road|Rd|Drive|Dr|Lane|Ln|Way|Parkway|Pkwy";
const STREET_RE = new RegExp(
  `(\\d{1,6}\\s+[A-Za-z0-9.'#-]{1,}(?:\\s+[A-Za-z0-9.'#-]{1,}){0,6}\\s(?:${STREET_SUFFIX})\\.?)`,
  "i",
);

function withSuite(street: string, text: string): string {
  if (/\b(?:suite|ste)\b/i.test(street)) return street;
  const idx = text.toLowerCase().indexOf(street.toLowerCase());
  const window = idx >= 0 ? text.slice(idx, idx + street.length + 40) : text;
  const suite = window.match(/\b(?:Suite|Ste)\.?\s+\d{1,6}[A-Za-z]?\b/);
  return suite ? `${street} ${suite[0]}` : street;
}

export function extractUsPostalAddress(text: string): DiscoveredPostalAddress | null {
  const jsonLd = text.match(
    /"streetAddress"\s*:\s*"([^"]{3,120})"[\s\S]{0,240}?"addressLocality"\s*:\s*"([^"]{2,80})"[\s\S]{0,160}?"addressRegion"\s*:\s*"([^"]{2,40})"[\s\S]{0,80}?"postalCode"\s*:\s*"([^"]{4,12})"/i,
  );
  if (jsonLd) {
    return {
      street: withSuite(jsonLd[1]!.trim(), text),
      city: jsonLd[2]!.trim(),
      state: jsonLd[3]!.trim(),
      zip: jsonLd[4]!.trim(),
      country: "US",
    };
  }

  const compact = text.replace(/\s+/g, " ");
  const line = compact.match(
    new RegExp(
      `(\\d{1,6}\\s+[A-Za-z0-9.'#-]{1,}(?:\\s+[A-Za-z0-9.'#-]{1,}){0,5}\\s(?:${STREET_SUFFIX})\\.?)\\s*,?\\s+([A-Za-z][A-Za-z .'-]{1,40}?),?\\s+([A-Z]{2})\\s+(\\d{5}(?:-\\d{4})?)`,
    ),
  );
  if (line) {
    return {
      street: withSuite(line[1]!.replace(/\s+/g, " ").trim(), compact),
      city: line[2]!.replace(/\s+/g, " ").trim().replace(/,$/, ""),
      state: line[3]!,
      zip: line[4]!,
      country: "US",
    };
  }

  const building = compact.match(
    /([A-Z][A-Za-z]+\s+\d{3,6}\s+[A-Za-z0-9.]{2,}(?:\s+[A-Za-z0-9.]{2,}){0,8}\s+(?:Suite|Ste)\.?\s+\d{1,6}[A-Za-z]?)\s+([A-Za-z][A-Za-z .'-]{1,40}),?\s+([A-Z]{2})\s+(\d{5}(?:-\d{4})?)/,
  );
  if (building) {
    return {
      street: building[1]!.replace(/\s+/g, " ").trim(),
      city: building[2]!.replace(/\s+/g, " ").trim().replace(/,$/, ""),
      state: building[3]!,
      zip: building[4]!,
      country: "US",
    };
  }

  const streetOnly = compact.match(STREET_RE);
  const cityState = compact.match(/\b([A-Za-z][A-Za-z .'-]{1,40}),\s+([A-Z]{2})\s+(\d{5}(?:-\d{4})?)\b/);
  if (streetOnly && cityState) {
    return {
      street: withSuite(streetOnly[1]!.replace(/\s+/g, " ").trim(), compact),
      city: cityState[1]!.trim(),
      state: cityState[2]!,
      zip: cityState[3]!,
      country: "US",
    };
  }
  return null;
}
