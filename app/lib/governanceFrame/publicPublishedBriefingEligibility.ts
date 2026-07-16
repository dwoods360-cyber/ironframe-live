/**
 * Shared eligibility for public published-briefing surfaces (RSS, Frame index
 * marketing archive). Safe for scripts — no server-only import.
 */
export function isPublicPublishedClassification(
  classification: string | null | undefined,
): boolean {
  const value = (classification ?? "").toLowerCase();
  if (value.includes("internal") || value.includes("staging")) {
    return false;
  }
  return true;
}
