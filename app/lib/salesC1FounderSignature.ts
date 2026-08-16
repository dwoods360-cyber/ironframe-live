/** Shared C1 founder sign-off — used by locked copy builders and HITL DISPATCH validation. */

export const C1_FOUNDER_EMAIL_SIGNATURE = [
  "Best,",
  "Dereck",
  "Founder, Ironframe",
  "dereck@ironframegrc.com",
].join("\n");

/** True when body ends with the locked founder signature (whitespace-tolerant). */
export function hasC1FounderEmailSignature(body: string): boolean {
  const normalized = String(body ?? "")
    .replace(/\r\n/g, "\n")
    .trim()
    .replace(/[ \t]+\n/g, "\n");
  return /Best,\s*\n\s*Dereck\s*\n\s*Founder,\s*Ironframe\s*\n\s*dereck@ironframegrc\.com\s*$/i.test(
    normalized,
  );
}
