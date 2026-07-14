/** Shared Ironleads SUSPECT identity keys — keep free of server-only so unit tests can import. */

/** Normalize company for case-insensitive SUSPECT matching. */
export function normalizeSuspectCompanyKey(company: string): string {
  return company.trim().toLowerCase().replace(/\s+/g, " ");
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
