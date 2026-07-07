/** Allowlisted public OSINT sources — Ironleads LeadScout may only fetch from these ids. */

export type AllowlistedSource = {
  id: string;
  label: string;
  url: string;
  /** Hostname must match exactly (no subdomain creep without explicit entry). */
  allowedHost: string;
  defaultBeachhead: 'REGIONAL_BHC' | 'UTILITY_NERC' | 'MSSP_ENCLAVE' | 'HEALTH_HIPAA';
  pollIntervalMinutes: number;
};

export const ALLOWLISTED_OSINT_SOURCES: readonly AllowlistedSource[] = [
  {
    id: 'cisa_kev_feed',
    label: 'CISA Known Exploited Vulnerabilities',
    url: 'https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json',
    allowedHost: 'www.cisa.gov',
    defaultBeachhead: 'UTILITY_NERC',
    pollIntervalMinutes: 360,
  },
  {
    id: 'hhs_ocr_breach_portal',
    label: 'HHS OCR Breach Portal (public JSON API)',
    url: 'https://ocrportal.hhs.gov/ocr/breach/breach_report.jsf',
    allowedHost: 'ocrportal.hhs.gov',
    defaultBeachhead: 'HEALTH_HIPAA',
    pollIntervalMinutes: 720,
  },
  {
    id: 'ffiec_press_releases',
    label: 'FFIEC Press Releases',
    url: 'https://www.ffiec.gov/press.htm',
    allowedHost: 'www.ffiec.gov',
    defaultBeachhead: 'REGIONAL_BHC',
    pollIntervalMinutes: 720,
  },
  {
    id: 'ironleads_fixture_regional_bhc',
    label: 'Ironleads Dev Fixture — Regional BHC trigger',
    url: 'fixture://regional-bhc-sample',
    allowedHost: 'fixture.ironleads.local',
    defaultBeachhead: 'REGIONAL_BHC',
    pollIntervalMinutes: 60,
  },
  {
    id: 'ironleads_fixture_mssp',
    label: 'Ironleads Dev Fixture — MSSP hiring signal',
    url: 'fixture://mssp-sample',
    allowedHost: 'fixture.ironleads.local',
    defaultBeachhead: 'MSSP_ENCLAVE',
    pollIntervalMinutes: 60,
  },
] as const;

export function getAllowlistedSource(id: string): AllowlistedSource | undefined {
  return ALLOWLISTED_OSINT_SOURCES.find(source => source.id === id);
}

export function assertUrlOnAllowlist(url: string): AllowlistedSource {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`Invalid URL for OSINT fetch: ${url}`);
  }

  if (parsed.protocol === 'fixture:') {
    const fixture = ALLOWLISTED_OSINT_SOURCES.find(source => source.url === url);
    if (!fixture) throw new Error(`Fixture URL not allowlisted: ${url}`);
    return fixture;
  }

  const match = ALLOWLISTED_OSINT_SOURCES.find(
    source => source.allowedHost === parsed.hostname && source.url.startsWith(`${parsed.protocol}//${parsed.host}`),
  );
  if (!match) {
    throw new Error(`OSINT host not on allowlist: ${parsed.hostname}`);
  }
  return match;
}
