import type { OpsActivityKind } from "@prisma/client";

/**
 * Resolve a clickable Ops Hub / docs href for a calendar activity sourceRef.
 * Prefer an explicit seed/API href when present; this is the fallback + default.
 */
export function hrefForOpsSourceRef(
  sourceRef: string | null | undefined,
  kind?: OpsActivityKind | string | null,
): string {
  const raw = (sourceRef ?? "").trim();
  if (!raw) return "/dashboard/operations?tab=calendar";

  const hashIdx = raw.indexOf("#");
  const base = hashIdx >= 0 ? raw.slice(0, hashIdx) : raw;
  const hash = hashIdx >= 0 ? raw.slice(hashIdx) : "";

  // Staged briefing-queue drafts (filename.md)
  if (/\.md$/i.test(base) || /^20\d{2}-\d{2}-\d{2}-draft-/i.test(base) || /^draft-/i.test(base)) {
    const file = base.replace(/^.*[/\\]/, "");
    const isNewsletter =
      /newsletter|ironcast|market-grc/i.test(file) ||
      kind === "NEWSLETTER_REVIEW" ||
      kind === "NEWSLETTER_DRAFT" ||
      kind === "NEWSLETTER_SYNDICATE";
    const tab = isNewsletter ? "newsletters" : "briefings";
    return `/dashboard/operations?tab=${tab}&draft=${encodeURIComponent(file)}`;
  }

  if (base.startsWith("video-series/") || base.includes("when-risk-enters-the-room")) {
    return `/docs/marketing-strategy/video-series/when-risk-enters-the-room${hash}`;
  }

  const rolloutHref: Record<string, string> = {
    "rollout/fl1-pilot-ready": "/docs/ops/pilot-to-commercial-readiness-checklist",
    "rollout/dp-pre-outreach-gate": "/docs/sales/design-partner-operator-launch-checklist",
    "rollout/dp-workflow-review": "/dashboard/operations/workflow-review#talk-track",
    "rollout/sms-dispatch-smoke": "/docs/ops/sales-sms-twilio-dispatch",
    "rollout/dp-icp-shortlist": "/dashboard/operations/library/icp-shortlist#section-d",
    "rollout/golden-path-regression": "/docs/ops/golden-path-checklist",
    "rollout/partner-client-provisioning-1d": "/docs/ops/pilot-to-commercial-readiness-checklist",
    "rollout/first-salesteam-dispatch": "/dashboard/operations/salesteam",
    "rollout/fl2-2a-stripe-lifecycle": "/docs/ops/pilot-to-commercial-readiness-checklist",
    "rollout/fl2-2b-entitlement-matrix": "/docs/ops/pilot-to-commercial-readiness-checklist",
    "rollout/fl2-2c-sku-pricing": "/docs/sales/design-partner-offer-sheet",
    "rollout/phase-b-first-live-partner": "/docs/sales/design-partner-recruitment",
    "rollout/fl2-2d-second-reference": "/docs/ops/pilot-to-commercial-readiness-checklist",
    "rollout/fl2-commercial-ready": "/docs/ops/pilot-to-commercial-readiness-checklist",
    "rollout/gtm-3-three-partners": "/docs/sales/design-partner-workforce-briefing",
    "rollout/stripe-live-mode-flip": "/docs/ops/pilot-to-commercial-readiness-checklist",
  };
  if (rolloutHref[base]) return rolloutHref[base];

  if (base.startsWith("research/GF-2026-001") || base.includes("GF-2026-001")) {
    return "/docs/governance-frame/research-papers/GF-2026-001-evolution-of-grc/manuscript";
  }

  if (base.startsWith("marketing/linkedin")) {
    return "/docs/marketing-strategy/linkedin-founder-cadence";
  }
  if (base === "marketing/live-surfaces-credibility-spotcheck") {
    return "/marketing";
  }
  if (base === "marketing/path-b-stripe-activation-confirm") {
    return "/docs/sales/design-partner-recruitment";
  }
  if (base === "marketing/warm-network-advisor-asks") {
    return "/docs/sales/design-partner-recruitment";
  }
  if (base === "marketing/cold-outreach-gate") {
    return "/docs/sales/design-partner-recruitment";
  }
  if (base === "marketing/control-first-newsletter-aug") {
    return "/dashboard/operations?tab=newsletters";
  }
  if (base === "marketing/companion-story-bank") {
    return "/docs/marketing-strategy/content-calendar";
  }
  if (base === "queue/archive-cf-grc-mirrors") {
    return "/dashboard/operations?tab=briefings";
  }

  if (base.startsWith("eng/eu-ai-act") || base.startsWith("eng/board-packet-ai-act")) {
    return "/dashboard/operations?tab=briefings&draft=2026-08-02-draft-research-eu-ai-act-august.md";
  }
  if (base.startsWith("eng/nydfs") || base.startsWith("eng/cmmc")) {
    return "/docs/stakeholder-deck";
  }

  if (base.startsWith("docs/")) {
    return `/${base.replace(/\.md$/i, "")}${hash}`;
  }

  return "/dashboard/operations?tab=calendar";
}

/** Normalize operator-supplied href (app-relative or absolute https). */
export function normalizeOpsActivityHref(href: string): string {
  const trimmed = href.trim();
  if (!trimmed) {
    throw new Error("href is required — add a link for the calendar card.");
  }
  if (trimmed.startsWith("/") || /^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  if (trimmed.startsWith("docs/")) {
    return `/${trimmed.replace(/\.md$/i, "")}`;
  }
  throw new Error("href must be an app path (e.g. /docs/...) or https URL.");
}

export function hrefForQueueDraft(filename: string): string {
  return hrefForOpsSourceRef(filename);
}
