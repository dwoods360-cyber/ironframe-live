/** Shared Ironleads SUSPECT identity keys — keep free of server-only so unit tests can import. */

/** Holding-co / rollup prefixes that often precede the operating brand. */
const PARENT_BRAND_PREFIX =
  /^(cbiz|kpmg|deloitte|pwc|ey|ernst\s*&\s*young|bdo|rsm|grant\s+thornton)\s+/i;

const LEGAL_SUFFIX = /\s+(inc\.?|llc\.?|ltd\.?|l\.?l\.?c\.?|corp\.?|corporation|co\.)$/i;

/**
 * Normalize company for SUSPECT matching / dedupe.
 * "CBIZ Pivot Point Security" and "Pivot Point Security" share one key.
 */
export function normalizeSuspectCompanyKey(company: string): string {
  let key = company.trim().toLowerCase().replace(/\s+/g, " ");
  key = key.replace(PARENT_BRAND_PREFIX, "");
  key = key.replace(LEGAL_SUFFIX, "");
  return key.trim();
}

/** Strip scheme/path so domain matching is stable across harvests. */
export function normalizeAccountDomain(domain: string | null | undefined): string | null {
  if (!domain?.trim()) return null;
  const host = domain
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .split("/")[0]
    ?.replace(/^www\./, "");
  return host || null;
}
