import type { SalesteamProspectWire } from "@/app/lib/server/salesteamIngressCore";

function isUsableEmail(email: string): boolean {
  const e = email.trim().toLowerCase();
  if (!e || !e.includes("@")) return false;
  if (e.endsWith("@ironleads.local")) return false;
  return true;
}

/** Prefer real EMAIL; fall back to SMS when only phone / fake inbox. */
export function resolveRequeueChannel(prospect: SalesteamProspectWire): "EMAIL" | "SMS" | null {
  if (isUsableEmail(prospect.email)) return "EMAIL";
  if (prospect.phone?.trim()) return "SMS";
  return null;
}
