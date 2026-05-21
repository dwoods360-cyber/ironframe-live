/**
 * GRC clearance hierarchy for evidence vault / ITAR-style export control (PUBLIC → TOP_SECRET).
 */

/** Cookie read by `/api/incident-report/*` and set from the Evidence Vault clearance simulator. */
export const USER_CLEARANCE_COOKIE_NAME = "ironframe-user-clearance";

export const CLEARANCE_LEVELS = ["PUBLIC", "CONFIDENTIAL", "SECRET", "TOP_SECRET"] as const;

export type ClearanceLevel = (typeof CLEARANCE_LEVELS)[number];

const ALIAS: Record<string, ClearanceLevel> = {
  PUBLIC: "PUBLIC",
  CONFIDENTIAL: "CONFIDENTIAL",
  SECRET: "SECRET",
  TOP_SECRET: "TOP_SECRET",
  "TOP-SECRET": "TOP_SECRET",
  TS: "TOP_SECRET",
};

export function normalizeClearanceLevel(raw: string): ClearanceLevel {
  const k = raw.trim().toUpperCase().replace(/[\s-]+/g, "_");
  return ALIAS[k] ?? ALIAS[raw.trim().toUpperCase()] ?? "PUBLIC";
}

export function clearanceRank(level: string): number {
  const n = normalizeClearanceLevel(level);
  return CLEARANCE_LEVELS.indexOf(n);
}

/** True when the user's clearance meets or exceeds the required label (hierarchical). */
export function hasClearance(userClearance: string, requiredClearance: string): boolean {
  const ur = clearanceRank(userClearance);
  const rr = clearanceRank(requiredClearance);
  if (rr < 0 || ur < 0) return false;
  return ur >= rr;
}

export function maxClearanceLevel(a: string, b: string): ClearanceLevel {
  const ia = clearanceRank(a);
  const ib = clearanceRank(b);
  return ia >= ib ? normalizeClearanceLevel(a) : normalizeClearanceLevel(b);
}

const ITAR_OR_CMMC_RE = /\b(ITAR|CMMC)\b/i;

/** Defense sector: titles mentioning ITAR or CMMC are treated as export-controlled subject matter. */
export function defenseTitleImpliesExportControl(title: string): boolean {
  return ITAR_OR_CMMC_RE.test(title);
}

export type PersistedChapterFlags = {
  isExportControlled: boolean;
  requiredClearance: string;
} | null;

/**
 * Merge persisted `EvidenceChapter` flags with Defense-sector title heuristics (ITAR / CMMC in title).
 */
/** Minimum simulated elevation tier for PERSEC workflow (locked chapters never stay at PUBLIC). */
export function clearanceElevationTarget(requiredClearance: string): string {
  const n = normalizeClearanceLevel(requiredClearance);
  if (n === "PUBLIC") return "CONFIDENTIAL";
  return n;
}

export function resolveEffectiveEvidenceChapter(
  title: string,
  tenantIndustry: string | null | undefined,
  persisted: PersistedChapterFlags,
): { isExportControlled: boolean; requiredClearance: ClearanceLevel } {
  const baseControlled = persisted?.isExportControlled ?? false;
  const baseClearance = normalizeClearanceLevel(persisted?.requiredClearance ?? "PUBLIC");

  let isExportControlled = baseControlled;
  let requiredClearance = baseClearance;

  if (tenantIndustry === "Defense" && defenseTitleImpliesExportControl(title)) {
    isExportControlled = true;
    requiredClearance = maxClearanceLevel(baseClearance, "CONFIDENTIAL");
  }

  return {
    isExportControlled,
    requiredClearance: normalizeClearanceLevel(requiredClearance),
  };
}
