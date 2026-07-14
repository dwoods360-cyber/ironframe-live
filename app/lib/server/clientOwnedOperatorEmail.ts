/**
 * Design-partner Path B: operator invite must be client-owned, never Ironframe's domain.
 * Returns an error message, or null if the address is acceptable.
 */
export function validateClientOwnedOperatorEmail(emailRaw: string): string | null {
  const email = emailRaw.trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return "Enter a valid operator email address.";
  }
  if (email.endsWith("@ironframegrc.com")) {
    return "Use a client-owned operator mailbox (e.g. ciso@acme.com) — not @ironframegrc.com.";
  }
  return null;
}
