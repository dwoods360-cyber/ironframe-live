export const COMPANY_PROFILE_SECTOR_OTHER = "Other" as const;
export const COMPANY_PROFILE_DEPARTMENT_OTHER = "Other" as const;

/** Human-readable industry sectors for primary company profile picklists. */
export const COMPANY_PROFILE_SECTORS = [
  "Healthcare",
  "Finance & Banking",
  "Insurance",
  "Energy & Utilities",
  "Defense & Aerospace",
  "Technology",
  "Manufacturing",
  "Retail & Consumer",
  "Government & Public Sector",
  "Education",
  "Critical Infrastructure",
  "Professional Services",
  COMPANY_PROFILE_SECTOR_OTHER,
] as const;

export type CompanyProfileSector = (typeof COMPANY_PROFILE_SECTORS)[number];

/** Common GRC / enterprise departments for multi-select picklists. */
export const COMPANY_PROFILE_DEPARTMENTS = [
  "Finance",
  "IT / Technology",
  "Legal",
  "Compliance & GRC",
  "Risk Management",
  "Security / SecOps",
  "Human Resources",
  "Operations",
  "Internal Audit",
  "Executive Leadership",
  COMPANY_PROFILE_DEPARTMENT_OTHER,
] as const;

export type CompanyProfileDepartment = (typeof COMPANY_PROFILE_DEPARTMENTS)[number];

const sectorLookup = new Map(
  COMPANY_PROFILE_SECTORS.map((sector) => [sector.toLowerCase(), sector]),
);

const departmentLookup = new Map(
  COMPANY_PROFILE_DEPARTMENTS.map((department) => [department.toLowerCase(), department]),
);

export function initializeSectorPicklist(existingSector: string): {
  select: string;
  other: string;
} {
  const trimmed = existingSector.trim();
  if (!trimmed) return { select: "", other: "" };

  const canonical = sectorLookup.get(trimmed.toLowerCase());
  if (canonical && canonical !== COMPANY_PROFILE_SECTOR_OTHER) {
    return { select: canonical, other: "" };
  }

  return { select: COMPANY_PROFILE_SECTOR_OTHER, other: trimmed };
}

export function initializeDepartmentPicklist(existingRaw: string): {
  selected: string[];
  other: string;
} {
  const tokens = existingRaw
    .split(/[,;\n]/)
    .map((value) => value.trim())
    .filter(Boolean);

  if (tokens.length === 0) {
    return { selected: [], other: "" };
  }

  const selected: string[] = [];
  const custom: string[] = [];

  for (const token of tokens) {
    const canonical = departmentLookup.get(token.toLowerCase());
    if (canonical && canonical !== COMPANY_PROFILE_DEPARTMENT_OTHER) {
      if (!selected.includes(canonical)) selected.push(canonical);
      continue;
    }
    custom.push(token);
  }

  if (custom.length > 0 && !selected.includes(COMPANY_PROFILE_DEPARTMENT_OTHER)) {
    selected.push(COMPANY_PROFILE_DEPARTMENT_OTHER);
  }

  return {
    selected,
    other: custom.join(", "),
  };
}

export function resolveSectorFromPicklist(select: string, other: string): string {
  if (select === COMPANY_PROFILE_SECTOR_OTHER) return other.trim();
  return select.trim();
}

export function resolveDepartmentsFromPicklist(
  selected: readonly string[],
  otherRaw: string,
): string[] {
  const resolved = selected
    .filter((value) => value !== COMPANY_PROFILE_DEPARTMENT_OTHER)
    .map((value) => value.trim())
    .filter(Boolean);

  if (selected.includes(COMPANY_PROFILE_DEPARTMENT_OTHER)) {
    const custom = otherRaw
      .split(/[,;\n]/)
      .map((value) => value.trim())
      .filter(Boolean);
    for (const name of custom) {
      if (!resolved.some((existing) => existing.toLowerCase() === name.toLowerCase())) {
        resolved.push(name);
      }
    }
  }

  return resolved;
}

export function isSectorPicklistReady(select: string, other: string): boolean {
  if (!select.trim()) return false;
  if (select === COMPANY_PROFILE_SECTOR_OTHER) return other.trim().length > 0;
  return true;
}

export const COMPANY_PROFILE_SELECT_CLASS =
  "mt-1 h-11 w-full rounded-lg border border-cyan-700/40 bg-[#020617]/40 px-3 font-mono text-sm text-cyan-50 outline-none focus:border-cyan-500";

export const COMPANY_PROFILE_MULTISELECT_CLASS =
  "mt-1 min-h-[8.5rem] w-full rounded-lg border border-cyan-700/40 bg-[#020617]/40 px-3 py-2 font-mono text-sm text-cyan-50 outline-none focus:border-cyan-500";
