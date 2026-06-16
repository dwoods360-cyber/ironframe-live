/**
 * TAS.md-aligned regulatory watch keywords (Ironsight poll filter).
 * Derived from constitutional sections: isolation, IR, AI governance, DMZ, BIGINT ledger.
 */
export const TAS_REGULATORY_KEYWORDS: readonly string[] = [
  "tenant isolation",
  "row level security",
  "multi-tenant",
  "incident response",
  "breach notification",
  "data breach",
  "cybersecurity incident",
  "artificial intelligence",
  "ai governance",
  "algorithmic accountability",
  "data masking",
  "data sanitization",
  "dmz",
  "reg s-p",
  "regulation s-p",
  "sb24-205",
  "colorado ai act",
  "nist csf",
  "soc 2",
  "iso 27001",
  "cmmc",
  "dora",
  "digital operational resilience",
  "eu ai act",
  "art. 9",
  "nydfs",
  "part 500",
  "uk cs&r",
  "cyber security and resilience",
  "notification",
  "disclosure",
  "personal data",
  "consumer privacy",
] as const;

export function tasKeywordMatches(text: string): string[] {
  const lower = text.toLowerCase();
  return TAS_REGULATORY_KEYWORDS.filter((kw) => lower.includes(kw));
}
