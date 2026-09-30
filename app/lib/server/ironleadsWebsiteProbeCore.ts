import "server-only";

import { buildCompanyWebsiteProbeUrls } from "@/app/lib/ironleadsOfficialSite";

/**
 * Best-effort public website guess when directory paste has company name only.
 * Not a search-engine scrape — probes common domain shapes and keeps the first
 * reachable host whose page text mentions a company token.
 */

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
  const tokens = companyTokens(company);
  const urls = buildCompanyWebsiteProbeUrls(company);
  if (urls.length === 0) return null;

  // Bound probes so Research stays within serverless time budgets.
  for (const url of urls) {
    if (await probeUrl(url, tokens)) return url;
  }
  return null;
}
