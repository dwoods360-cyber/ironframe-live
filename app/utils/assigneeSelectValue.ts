/** Stable lowercase token for pipeline assignee `<select>` values (auth id or email local-part). */
export function sanitizeAssigneeSelectValue(raw: string): string {
  const t = raw.trim().toLowerCase();
  if (!t) return "jr-grc-analyst";
  return (
    t
      .replace(/[^a-z0-9_-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || "jr-grc-analyst"
  );
}

export type AssigneeSelectOption = {
  value: string;
  label: string;
};

/** Shared team routing buckets (not tenant-specific operators). */
export const SHARED_TEAM_ASSIGNEE_OPTIONS: readonly AssigneeSelectOption[] = [
  { value: "secops", label: "SecOps Team" },
  { value: "grc", label: "GRC Team" },
  { value: "netsec", label: "NetSec" },
] as const;

/**
 * Human operators that appeared in the pre–Jul 2026 hardcoded assignee dropdown.
 * Merged after `user_role_assignments` + historical threat assignees so legacy
 * custody keys remain selectable until every operator has a workspace membership row.
 */
export const LEGACY_HUMAN_ASSIGNEE_OPTIONS: readonly AssigneeSelectOption[] = [
  { value: "dereck", label: "Dereck" },
  { value: "user_01", label: "user_01" },
] as const;

/** Team routing keys are not human forensic custody — resolution must block these. */
export const TEAM_ROUTING_ASSIGNEE_VALUES = new Set(
  SHARED_TEAM_ASSIGNEE_OPTIONS.map((opt) => opt.value.toLowerCase()),
);
