/**
 * Shared LinkedIn Publishing Desk id helpers (safe for client + seed + links).
 * Desk slots are keyed by Ops calendar `sourceRef` under `marketing/linkedin*`.
 */

/** Legacy static catalog ids kept for deep links and APP_DOCS slugs. */
export const LINKEDIN_LEGACY_SOURCE_REF_TO_ID: Record<string, string> = {
  "marketing/linkedin-2026-08-06-heatmap": "mon-heatmap",
  "marketing/linkedin-2026-07-23": "wed-product-demo",
  "marketing/linkedin-2026-08-08-collection": "fri-collection",
};

export const LINKEDIN_LEGACY_ID_TO_SOURCE_REF: Record<string, string> = {
  "mon-heatmap": "marketing/linkedin-2026-08-06-heatmap",
  "wed-product-demo": "marketing/linkedin-2026-07-23",
  "fri-collection": "marketing/linkedin-2026-08-08-collection",
};

/** True when an Ops sourceRef is a founder LinkedIn post card. */
export function isLinkedInOpsSourceRef(sourceRef: string | null | undefined): boolean {
  const raw = (sourceRef ?? "").trim().toLowerCase();
  return raw.startsWith("marketing/linkedin");
}

/**
 * Stable desk id from Ops sourceRef.
 * Examples:
 * - marketing/linkedin-2026-08-06-heatmap → mon-heatmap (legacy)
 * - marketing/linkedin-2026-08-11-ai-evidence → 2026-08-11-ai-evidence
 */
export function linkedInDeskIdFromSourceRef(
  sourceRef: string | null | undefined,
): string | null {
  const raw = (sourceRef ?? "").trim();
  if (!isLinkedInOpsSourceRef(raw)) return null;
  const legacy = LINKEDIN_LEGACY_SOURCE_REF_TO_ID[raw];
  if (legacy) return legacy;
  const stripped = raw.replace(/^marketing\/linkedin-?/i, "").replace(/^\/+/, "");
  const id = stripped
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return id || null;
}

/** Publishing Desk deep link for a LinkedIn calendar sourceRef. */
export function linkedInPublishingDeskHref(sourceRef: string | null | undefined): string {
  const id = linkedInDeskIdFromSourceRef(sourceRef);
  if (!id) return "/dashboard/operations/publishing?desk=linkedin";
  return `/dashboard/operations/publishing?desk=linkedin&li=${encodeURIComponent(id)}`;
}

/** APP_DOCS slug for a desk slot. */
export function linkedInDeskAppDocSlug(deskId: string): string {
  return `marketing-strategy/linkedin-drafts/${deskId}`;
}

/** Best-effort weekday label from title or due date. */
export function linkedInSlotLabelFromTitleOrDue(
  title: string,
  dueAt?: Date | string | null,
): string {
  const fromTitle = title.match(
    /\b(Mon|Tue|Wed|Thu|Fri|Sat|Sun)(?:day)?\b/i,
  );
  if (fromTitle?.[1]) {
    const day = fromTitle[1].slice(0, 3);
    return day.charAt(0).toUpperCase() + day.slice(1).toLowerCase();
  }
  if (dueAt) {
    const d = typeof dueAt === "string" ? new Date(dueAt) : dueAt;
    if (!Number.isNaN(d.getTime())) {
      return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.getUTCDay()] ?? "Slot";
    }
  }
  return "Slot";
}
