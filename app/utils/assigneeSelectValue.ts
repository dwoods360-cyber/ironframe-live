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
