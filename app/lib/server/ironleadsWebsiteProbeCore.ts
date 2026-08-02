import "server-only";

/**
 * Best-effort public website guess when directory paste has company name only.
 * Not a search-engine scrape — probes common domain shapes and keeps the first
 * reachable host whose page text mentions a company token.
 */

function companySlugCandidates(company: string): string[] {
  const base = company
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/\b(inc|llc|ltd|corp|corporation|company|co|plc|lp|llp)\b\.?/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  if (!base) return [];
  const compact = base.replace(/\s+/g, "");
  const dashed = base.replace(/\s+/g, "-");
  const tokens = base.split(/\s+/).filter(Boolean);
  const out = new Set<string>();
  if (compact.length >= 3) out.add(compact);
  if (dashed.length >= 3 && dashed !== compact) out.add(dashed);
  if (tokens.length >= 2) {
    out.add(tokens.join(""));
    out.add(tokens.slice(0, 2).join(""));
  }
  return [...out].slice(0, 4);
}

function companyTokens(company: string): string[] {
  return company
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 3 && !["inc", "llc", "ltd", "corp", "the", "and"].includes(t))
    .slice(0, 4);
}

async function probeUrl(url: string, tokens: string[]): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4500);
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "user-agent": "IronframeIronleadsWebsiteProbe/1.0",
        accept: "text/html,application/xhtml+xml",
      },
    });
    clearTimeout(timer);
    if (!res.ok) return false;
    const ctype = res.headers.get("content-type") ?? "";
    if (ctype && !/text\/html|application\/xhtml/i.test(ctype)) return false;
    const text = (await res.text()).slice(0, 80_000).toLowerCase();
    if (!text || text.length < 40) return false;
    if (tokens.length === 0) return true;
    return tokens.some((t) => text.includes(t));
  } catch {
    return false;
  }
}

/** Probe likely public websites for a company name. Returns https URL or null. */
export async function probeCompanyWebsite(companyName: string): Promise<string | null> {
  const company = companyName.trim();
  if (company.length < 2) return null;
  const slugs = companySlugCandidates(company);
  const tokens = companyTokens(company);
  if (slugs.length === 0) return null;

  const tlds = ["com", "io", "co", "net", "us"];
  const urls: string[] = [];
  for (const slug of slugs) {
    for (const tld of tlds) {
      urls.push(`https://www.${slug}.${tld}`);
      urls.push(`https://${slug}.${tld}`);
    }
  }

  // Bound probes so Research stays within serverless time budgets.
  for (const url of urls.slice(0, 16)) {
    if (await probeUrl(url, tokens)) return url;
  }
  return null;
}
