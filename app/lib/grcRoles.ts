/**
 * GRC workspace simulation roles (cookie `ironframe-role`) aligned with Prisma `UserRole`.
 */

export const GRC_WORKSPACE_ROLES = [
  "JR_GRC_ANALYST",
  "SR_GRC_ANALYST",
  "GRC_MANAGER",
  "DIRECTOR_OF_COMPLIANCE",
  "CISO",
  "INTERNAL_AUDITOR",
  "EXTERNAL_AUDITOR",
  "GLOBAL_ADMIN",
] as const;

export type GrcWorkspaceRole = (typeof GRC_WORKSPACE_ROLES)[number];

export const GRC_ROLE_LABELS: Record<GrcWorkspaceRole, string> = {
  JR_GRC_ANALYST: "Junior GRC Analyst",
  SR_GRC_ANALYST: "Senior GRC Analyst",
  GRC_MANAGER: "GRC Manager",
  DIRECTOR_OF_COMPLIANCE: "Director of Compliance",
  CISO: "CISO",
  INTERNAL_AUDITOR: "Internal Auditor",
  EXTERNAL_AUDITOR: "External Auditor",
  GLOBAL_ADMIN: "Global Administrator",
};

const ROLE_SET = new Set<string>(GRC_WORKSPACE_ROLES);

/** Legacy cookie values from older dev switchers. */
const LEGACY_COOKIE_TO_ROLE: Record<string, GrcWorkspaceRole> = {
  "Global Admin": "GLOBAL_ADMIN",
  "Company Analyst": "JR_GRC_ANALYST",
  Auditor: "INTERNAL_AUDITOR",
};

const BROAD_TENANT_ACCESS = new Set<GrcWorkspaceRole>([
  "GLOBAL_ADMIN",
  "CISO",
  "DIRECTOR_OF_COMPLIANCE",
  "GRC_MANAGER",
]);

const SCOPED_ANALYST = new Set<GrcWorkspaceRole>(["JR_GRC_ANALYST", "SR_GRC_ANALYST"]);

const AUDITOR_FAMILY = new Set<GrcWorkspaceRole>(["INTERNAL_AUDITOR", "EXTERNAL_AUDITOR"]);

export const DEFAULT_GRC_WORKSPACE_ROLE: GrcWorkspaceRole = "JR_GRC_ANALYST";

export function parseWorkspaceRoleFromCookie(raw: string | null | undefined): GrcWorkspaceRole {
  if (raw == null) return DEFAULT_GRC_WORKSPACE_ROLE;
  const decoded = decodeURIComponent(raw).trim();
  if (!decoded) return DEFAULT_GRC_WORKSPACE_ROLE;
  const legacy = LEGACY_COOKIE_TO_ROLE[decoded];
  if (legacy) return legacy;
  if (ROLE_SET.has(decoded)) return decoded as GrcWorkspaceRole;
  return DEFAULT_GRC_WORKSPACE_ROLE;
}

export function formatUserRoleLabel(role: string): string {
  if (ROLE_SET.has(role)) return GRC_ROLE_LABELS[role as GrcWorkspaceRole];
  return role.replace(/_/g, " ");
}

export function isBroadTenantAccess(role: GrcWorkspaceRole): boolean {
  return BROAD_TENANT_ACCESS.has(role);
}

export function isScopedAnalystRole(role: GrcWorkspaceRole): boolean {
  return SCOPED_ANALYST.has(role);
}

export function isAuditorFamilyRole(role: GrcWorkspaceRole): boolean {
  return AUDITOR_FAMILY.has(role);
}

export function mapSupabaseMetadataRoleToDisplay(raw: string | null | undefined): string {
  const t = (raw ?? "").trim();
  if (!t) return GRC_ROLE_LABELS.JR_GRC_ANALYST;
  if (ROLE_SET.has(t)) return GRC_ROLE_LABELS[t as GrcWorkspaceRole];
  return t;
}
