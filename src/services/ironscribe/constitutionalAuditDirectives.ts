/**
 * Ironscribe (Agent 5): maps Ironguard / Ironlock telemetry to TAS-style directive labels for GRC audit prose.
 */

export type ConstitutionalDirectiveKey = "IRONGUARD_13" | "IRONLOCK_06" | "RESIDUE_GAP";

/** ~$1.6B governed-financial baseline (Irontally market benchmark) — daily audit attestation cross-reference. */
export const GOVERNED_FINANCIAL_BASELINE_USD_BILLIONS = 1.6;

export function tasDirectiveLabel(key: ConstitutionalDirectiveKey): string {
  switch (key) {
    case "IRONGUARD_13":
      return "Ironguard-13 (Cross-Tenant Isolation)";
    case "IRONLOCK_06":
      return "Ironlock-06 (Freeze Protocol)";
    case "RESIDUE_GAP":
      return "Unmapped enforcement signal (TAS residue)";
    default:
      return key;
  }
}

/**
 * Returns a directive bucket for each persisted Ironguard violation `errorCode`.
 * Unknown / empty codes are treated as **residue** for amendment tracking (Task 3).
 */
export function directiveKeyFromIronguardErrorCode(errorCode: string | null | undefined): ConstitutionalDirectiveKey {
  const c = (errorCode ?? "").trim().toUpperCase();
  if (!c || c === "UNKNOWN") return "RESIDUE_GAP";
  if (
    c === "CROSS_TENANT_API_BLOCKED" ||
    c.startsWith("IRONGUARD_") ||
    c.includes("IRONGUARD")
  ) {
    return "IRONGUARD_13";
  }
  return "RESIDUE_GAP";
}
