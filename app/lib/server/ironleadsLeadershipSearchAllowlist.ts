/**
 * Press / cyber / channel domains for Ironleads leadership OSINT fill.
 * Mirror of docs/ops/google-cse-ironleads-sites.txt (without *. prefix).
 * Used to filter Brave/SerpAPI open-web hits (Google CSE used a Sites list).
 */

export const IRONLEADS_LEADERSHIP_SEARCH_ALLOWLIST: readonly string[] = [
  "businesswire.com",
  "prnewswire.com",
  "globenewswire.com",
  "einpresswire.com",
  "newswire.com",
  "accesswire.com",
  "benzinga.com",
  "bloomberg.com",
  "reuters.com",
  "prweb.com",
  "darkreading.com",
  "scmagazine.com",
  "scworld.com",
  "securityweek.com",
  "cybersecuritydive.com",
  "thehackernews.com",
  "msspalert.com",
  "channelere2e.com",
  "crn.com",
  "channelpartnersonline.com",
  "sdxcentral.com",
  "zdnet.com",
  "techrepublic.com",
  "techcrunch.com",
  "venturebeat.com",
  "forbes.com",
  "businessinsider.com",
  "csoonline.com",
  "infosecurity-magazine.com",
  "helpnetsecurity.com",
  "cybersecasia.net",
  "securityboulevard.com",
  "bankinfosecurity.com",
  "govinfosecurity.com",
  "healthcareinfosecurity.com",
  "itsecurityguru.org",
  "cyberriskalliance.com",
  "cybersecurityventures.com",
  "channelnomics.com",
  "msp-channel.com",
  "mspsuccess.com",
  "managedservices.com",
  "clutch.co",
  "g2.com",
  "capterra.com",
  "linkedin.com",
  "youtube.com",
  "wikipedia.org",
  "cisa.gov",
  "nist.gov",
] as const;

/** Extra public-record / event / directory hosts (Brave/SerpAPI only — CSE cap is 50). */
export const IRONLEADS_PROSPECT_OSINT_EXTRA_HOSTS: readonly string[] = [
  "opencorporates.com",
  "sec.gov",
  "crunchbase.com",
  "pitchbook.com",
  "theorg.com",
  "eventbrite.com",
  "gisec.ae",
  "rsaconference.com",
  "blackhat.com",
  "ventureatlanta.org",
  "channelnomics.com",
] as const;

/** Aggregators that publish guessed emails — never treat as Email PASS / published seat. */
export const IRONLEADS_EMAIL_AGGREGATOR_HOSTS: readonly string[] = [
  "rocketreach.co",
  "zoominfo.com",
  "apollo.io",
  "lusha.com",
  "contactout.com",
  "hunter.io",
  "prospeo.io",
  "signalhire.com",
  "torre.ai",
  "seamless.ai",
  "snov.io",
  "clearbit.com",
] as const;

function hostFromUrl(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

function hostMatchesList(host: string, domains: readonly string[]): boolean {
  return domains.some((domain) => host === domain || host.endsWith(`.${domain}`));
}

function normalizeAccountHost(accountDomain?: string | null): string | null {
  const raw = accountDomain?.trim().toLowerCase().replace(/^www\./, "") ?? "";
  if (!raw) return null;
  return raw.replace(/^https?:\/\//, "").split("/")[0] ?? raw;
}

export function isEmailAggregatorUrl(url: string): boolean {
  const host = hostFromUrl(url);
  return host ? hostMatchesList(host, IRONLEADS_EMAIL_AGGREGATOR_HOSTS) : false;
}

export function isAllowlistedLeadershipUrl(
  url: string,
  accountDomain?: string | null,
): boolean {
  const host = hostFromUrl(url);
  if (!host) return false;
  const accountHost = normalizeAccountHost(accountDomain);
  if (accountHost && (host === accountHost || host.endsWith(`.${accountHost}`))) {
    return true;
  }
  return (
    hostMatchesList(host, IRONLEADS_LEADERSHIP_SEARCH_ALLOWLIST) ||
    hostMatchesList(host, IRONLEADS_PROSPECT_OSINT_EXTRA_HOSTS)
  );
}
