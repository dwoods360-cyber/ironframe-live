/**
 * Path B / outreach From lock — customer-facing mail must use ironframegrc.com
 * (Zoho/ImproVMX alias), never a personal Gmail From.
 */

const DEFAULT_FROM_EMAIL = "dereck@ironframegrc.com";
const DEFAULT_FROM_NAME = "Dereck Woods";

const GMAIL_RE = /@gmail\.com$/i;

export function resolveSalesFromEmail(): string {
  const email =
    process.env.SALES_FROM_EMAIL?.trim() ||
    process.env.PARTNERS_FROM_EMAIL?.trim() ||
    process.env.IRONCAST_FROM_EMAIL?.trim() ||
    DEFAULT_FROM_EMAIL;
  if (GMAIL_RE.test(email)) {
    throw new Error(
      `Sales From refused: ${email} — customer-facing mail must use @ironframegrc.com (Zoho), not Gmail.`,
    );
  }
  return email.toLowerCase();
}

export function resolveSalesFromDisplay(): string {
  const name =
    process.env.SALES_FROM_NAME?.trim() ||
    process.env.IRONCAST_FROM_NAME?.trim() ||
    DEFAULT_FROM_NAME;
  return `${name} <${resolveSalesFromEmail()}>`;
}

/** True when an inbound To/received_for address is our sales mailbox (or env allow-list). */
export function isSalesInboundMailbox(address: string): boolean {
  const normalized = address.trim().toLowerCase();
  if (!normalized.includes("@")) return false;
  const sales = resolveSalesFromEmail();
  if (normalized === sales) return true;
  const extra = (process.env.OUTREACH_REPLY_INBOUND_TO || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return extra.includes(normalized);
}
