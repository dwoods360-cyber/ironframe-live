import type { OpsActivityKind, OpsActivityStatus } from "@prisma/client";

import { isLinkedInOpsSourceRef, linkedInPublishingDeskHref } from "./linkedinDeskIds";
import { hrefForOpsSourceRef } from "./opsScheduleLinks";

/**
 * Seed row for Ops Calendar.
 * - `synopsis` — one-sentence what/why (stored in OpsActivity.notes)
 * - `href` — clickable destination (optional; derived from sourceRef when omitted)
 * - `nextActions` — checklist of what still needs doing (open items)
 * - `priorityHint` — lower = higher priority before global P1…Pn renumbering
 */
export type OpsScheduleSeedSpec = {
  title: string;
  kind: OpsActivityKind;
  status: OpsActivityStatus;
  dueAt: string;
  sourceRef: string;
  /** Brief what/why for the calendar card (required). */
  synopsis: string;
  /** App path or https URL. Defaults from sourceRef when omitted. */
  href?: string;
  /** Required for DONE/CANCELLED — what was completed so it can be reviewed later. */
  outcome?: string;
  /** Checklist of remaining work. Defaults by kind/sourceRef when omitted (open items). */
  nextActions?: string[];
  /**
   * Optional ranking hint (lower = more urgent). Final stored `priority` is the
   * global open-work order (1 = P1) after `assignCalendarPriorities`.
   */
  priorityHint?: number;
  /** Final assigned rank after `assignCalendarPriorities` (1 = highest). */
  priority?: number;
};

/**
 * Resolve the link that will be stored/shown for a seed row.
 * LinkedIn cards always deep-link to their Publishing Desk draft slot (`?li=`).
 */
export function hrefForSeedSpec(spec: Pick<OpsScheduleSeedSpec, "sourceRef" | "kind" | "href">): string {
  if (isLinkedInOpsSourceRef(spec.sourceRef)) {
    return linkedInPublishingDeskHref(spec.sourceRef);
  }
  return (spec.href?.trim() || hrefForOpsSourceRef(spec.sourceRef, spec.kind)).trim();
}

/** Checklist item with completion state (stored as `[ ]` / `[x]` lines). */
export type OpsChecklistItem = {
  text: string;
  done: boolean;
};

/** Serialize checklist for DB storage (markdown-style checkboxes). */
export function serializeNextActionItems(items: OpsChecklistItem[]): string {
  return items
    .map((item) => {
      const text = item.text.trim();
      if (!text) return "";
      return `${item.done ? "[x]" : "[ ]"} ${text}`;
    })
    .filter(Boolean)
    .join("\n");
}

/** @deprecated Prefer serializeNextActionItems — writes all steps unchecked. */
export function serializeNextActions(actions: string[]): string {
  return serializeNextActionItems(actions.map((text) => ({ text, done: false })));
}

/** Parse checklist from DB storage (supports plain lines or `[ ]` / `[x]`). */
export function parseNextActionItems(raw: string | null | undefined): OpsChecklistItem[] {
  if (!raw?.trim()) return [];
  return raw
    .split(/\r?\n/)
    .map((line) => {
      const trimmed = line.replace(/^[-*•]\s*/, "").trim();
      if (!trimmed) return null;
      const checked = /^\[[xX]\]\s+/.test(trimmed);
      const withBox = /^\[[xX\s]\]\s+/.test(trimmed);
      const text = withBox ? trimmed.replace(/^\[[xX\s]\]\s+/, "").trim() : trimmed;
      if (!text) return null;
      return { text, done: checked };
    })
    .filter((item): item is OpsChecklistItem => Boolean(item));
}

/** Parse checklist texts only (for search / legacy callers). */
export function parseNextActions(raw: string | null | undefined): string[] {
  return parseNextActionItems(raw).map((item) => item.text);
}

/**
 * Merge a new action text list onto previous items, preserving checked state
 * when the step text still matches.
 */
export function mergeNextActionItems(
  previous: OpsChecklistItem[],
  nextTexts: string[],
): OpsChecklistItem[] {
  const prevByText = new Map(previous.map((item) => [item.text, item.done]));
  return nextTexts
    .map((text) => text.trim())
    .filter(Boolean)
    .map((text) => ({ text, done: prevByText.get(text) ?? false }));
}

/**
 * Default "what needs to be done" checklist for open calendar work.
 * Closed items return [].
 */
export function defaultNextActionsFor(args: {
  kind: OpsActivityKind | string;
  status: OpsActivityStatus | string;
  title?: string;
  sourceRef?: string | null;
}): string[] {
  if (args.status === "DONE" || args.status === "CANCELLED") return [];

  const ref = (args.sourceRef ?? "").toLowerCase();
  const title = (args.title ?? "").toLowerCase();
  const kind = args.kind;

  if (ref.startsWith("gf/desk-notes#research") || title.includes("desk note — research")) {
    return [
      "Scan primary sources (CISA KEV, regulator notices, EDGAR Item 1.05, EU OJ) for one live signal",
      "Avoid lead topics already used by this month’s briefing/newsletter",
      "Stage quarantine draft as *-draft-desk-note-* (Publishing Desk → Desk notes)",
      "Mark Done when draft is staged for Tuesday Approve",
    ];
  }
  if (
    ref.startsWith("gf/desk-notes#publish") ||
    /-draft-desk-note-/i.test(ref) ||
    /-draft-signal-/i.test(ref) ||
    title.includes("desk note — publish")
  ) {
    return [
      "Open Publishing Desk → Desk notes for this draft",
      "Verify citations + product boundary; Approve / promote",
      "Confirm live on research.ironframegrc.com/desk-notes",
      "Mark Done with public URL in outcome",
    ];
  }
  if (ref.startsWith("marketing/live-surfaces")) {
    return [
      "Spot-check /marketing, /product-demo, /trust-center, /register/contact",
      "Confirm research.ironframegrc.com shows only published GF briefings (not draft paper body)",
      "Fix broken CTAs / stale claims before first LinkedIn posts",
    ];
  }
  if (ref.startsWith("marketing/path-b-stripe")) {
    return [
      "Confirm tenant-scoped Path B activation checkout is live",
      "Verify PENDING partners never land on generic /pricing",
      "Record pass/fail in outcome",
    ];
  }
  if (ref.startsWith("marketing/warm-network")) {
    return [
      "List 5–10 warm intros / advisors to ask this week",
      "Ask who is standing up SOC 2 / ISO / board-risk friction — not “buy our tool”",
      "Log warm replies before any cold DISPATCH batch",
    ];
  }
  if (ref.startsWith("marketing/founder-li-network")) {
    return [
      "Prune spam / non-ICP suggested noise (2 min)",
      "Engage ≤3 peers (comment/react/reply) — no Ironframe pitch",
      "Send 3–5 Path B–fit connection requests with a 1-line personal note",
      "Mark Done (outcome: connects sent / notable threads)",
    ];
  }
  if (ref.startsWith("marketing/cold-outreach-gate")) {
    return [
      "Confirm LinkedIn Mon/Wed/Fri week-1 posts published (or scheduled)",
      "Confirm pre-outreach A1–A4 + Stripe Path B + live surfaces spot-check are Done",
      "Only then Start first SalesTeam DISPATCH batch",
    ];
  }
  if (ref.startsWith("marketing/linkedin-2026-08-11-ai-evidence")) {
    return [
      "Open Publishing Desk → LinkedIn (this calendar card)",
      "Verify research citations, Copy body → LinkedIn",
      "Paste first-comment CTA after publish",
      "Mark Done with LinkedIn URL",
    ];
  }
  if (ref.startsWith("marketing/linkedin-2026-08-14-residual")) {
    return [
      "Open Publishing Desk → LinkedIn (this calendar card)",
      "Verify research citations, Copy body → LinkedIn",
      "Paste first-comment CTA after publish",
      "Mark Done with LinkedIn URL",
    ];
  }
  if (
    ref.startsWith("marketing/linkedin-2026-08-17-ccm") ||
    ref.startsWith("marketing/linkedin-2026-08-19-board-delta") ||
    ref.startsWith("marketing/linkedin-2026-08-21-tprm") ||
    ref.startsWith("marketing/linkedin-2026-08-24-shared-stack") ||
    ref.startsWith("marketing/linkedin-2026-08-26-board-export") ||
    ref.startsWith("marketing/linkedin-2026-09-08-heatmap-callback") ||
    ref.startsWith("marketing/linkedin-2026-09-12-enclaves-callback") ||
    ref.startsWith("marketing/linkedin-2026-09-15-ma-security-debt")
  ) {
    return [
      "Open Publishing Desk → LinkedIn (this calendar card)",
      "Verify research citations, Copy body → LinkedIn",
      "Paste first-comment CTA after publish",
      "Mark Done with LinkedIn URL",
    ];
  }
  if (ref.startsWith("rollout/dp-pre-outreach") || title.includes("pre-outreach")) {
    return [
      "Complete A1–A4 on design-partner operator launch checklist",
      "Confirm SMS/Twilio smoke and Golden Path are green (or scheduled)",
      "Mark this gate Done with outcome once A1–A4 pass",
    ];
  }
  if (ref.includes("sms-dispatch") || title.includes("sms")) {
    return [
      "Run Twilio SalesTeam DISPATCH smoke per docs/ops/sales-sms-twilio-dispatch.md",
      "Confirm delivery + HITL board path",
      "Record result and mark Done",
    ];
  }
  if (ref.includes("golden-path")) {
    return [
      "Run Golden Path Stops 1–5 smoke",
      "Fix any failing stop before DP outreach",
      "Record pass/fail and mark Done",
    ];
  }
  if (ref.includes("icp-shortlist") || title.includes("icp")) {
    return [
      "Finalize Path B ICP shortlist",
      "Identify warm-intro targets",
      "Hand off list for first DISPATCH batch",
    ];
  }
  if (ref.includes("partner-client-provisioning") || title.includes("1d")) {
    return [
      "Walk partner→client provisioning (1D) end-to-end",
      "Document any blockers in readiness evidence log",
      "Mark Done when walkthrough passes",
    ];
  }
  if (ref.includes("first-salesteam-dispatch") || title.includes("dispatch batch")) {
    return [
      "Confirm pre-outreach + SMS gates are Done",
      "Queue first Path B DISPATCH batch on SalesTeam board",
      "Send with HITL approval and log outcomes",
    ];
  }
  if (ref.includes("stripe") || ref.includes("fl2-2a") || ref.includes("entitlement") || ref.includes("sku-pricing") || ref.includes("fl2-")) {
    return [
      "Execute the named FL2 commercial gate checklist item",
      "Capture evidence (pass/fail + links)",
      "Mark Done with outcome when the gate PASSes",
    ];
  }
  if (ref.includes("phase-b-first") || title.includes("first paying")) {
    return [
      "Close first paying Path B design partner to ACTIVE",
      "Confirm SKU/billing/entitlements align",
      "Record partner + evidence; mark Done",
    ];
  }
  if (ref.includes("gtm-3") || title.includes("three paying")) {
    return [
      "Land third paying Path B design partner",
      "Verify cohort evidence for GTM-3",
      "Mark Done with partner list in outcome",
    ];
  }
  if (ref.startsWith("video-series/") || title.startsWith("video")) {
    if (title.includes("publish")) {
      return [
        "Confirm episode/build assets are ready",
        "Publish to LinkedIn + listed product surfaces",
        "Verify CTA links; mark Done with publish URLs",
      ];
    }
    if (title.includes("style lock") || title.includes("phase 0")) {
      return [
        "Lock character refs, boardroom stills, title/end cards",
        "Finish V1–V2 shot lists",
        "Mark Done when style pack is frozen",
      ];
    }
    return [
      "Produce/edit the named episode assets",
      "Align to style pack and shot list",
      "Hand off for publish date; mark Done when build is complete",
    ];
  }
  if (ref.startsWith("marketing/linkedin") || title.includes("linkedin")) {
    return [
      "Draft the founder LinkedIn post for this slot",
      "Publish Mon/Wed/Fri per cadence",
      "Mark Done with post URL in outcome",
    ];
  }
  if (ref.includes("control-first-newsletter") || title.includes("control-first")) {
    if (ref.includes("#publish") || title.toLowerCase().includes("publish") || title.toLowerCase().includes("promote")) {
      return [
        "Open Publishing Desk → Newsletters (this draft)",
        "Claim-hygiene pass; Promote or Deny (human only)",
        "If Promote: syndicate / record publish URL in outcome",
      ];
    }
    return [
      "Open Publishing Desk → Newsletters (Control-First draft)",
      "Voice-pass + verify Section V citations (Parts 1–3 + NIST + SEC 2022-168)",
      "Mark Done when ready for promote window",
    ];
  }
  if (ref.includes("companion-story") || title.includes("story bank")) {
    return [
      "Confirm video Phase 1 style freeze is complete",
      "Schedule Friday companion lessons from story bank",
      "Mark Done with scheduled dates",
    ];
  }
  if (ref.startsWith("research/gf-2026") || kind === "RESEARCH_PAPER") {
    if (title.includes("publish") || title.includes("approve")) {
      return [
        "Confirm editorial + product-boundary reviews passed",
        "Operator Approve / publish (human only)",
        "Record publish path in outcome",
      ];
    }
    if (title.includes("boundary")) {
      return [
        "Review manuscript for product CTA leakage",
        "Require institutional GRC voice only",
        "Mark Done with pass/fail notes",
      ];
    }
    return [
      "Complete editorial + regulatory-scope review",
      "Log citation/scope findings",
      "Mark Done when ready for product-boundary review",
    ];
  }
  if (ref.startsWith("eng/") || title.startsWith("eng —") || title.includes("board packet")) {
    return [
      "Run the named engineering/board readiness review",
      "Document gaps vs target obligation date",
      "Mark Done with findings summary",
    ];
  }
  if (kind === "NEWSLETTER_SYNDICATE" || title.includes("syndicate")) {
    return [
      "Confirm newsletter was promoted/published",
      "Run syndication (RSS / Ironcast HTML / channels)",
      "Mark Done with syndicate paths",
    ];
  }
  if (kind === "BRIEFING_DRAFT" || (kind === "NEWSLETTER_DRAFT" && !ref.includes(".md"))) {
    return [
      "Finish draft content against synopsis scope",
      "Stage or open for Ops review",
      "Mark Done when ready for review/publish window",
    ];
  }
  if (
    kind === "BRIEFING_REVIEW" ||
    kind === "NEWSLETTER_REVIEW" ||
    /\.md$/i.test(ref) ||
    title.includes("queue — review")
  ) {
    return [
      "Open the linked quarantine draft",
      "Fact-check citations and product/tenant boundary",
      "Promote or Deny in Ops Hub; mark Done with outcome",
    ];
  }

  return [
    "Open linked work and complete the stated objective",
    "Capture evidence / result",
    "Mark Done with a short outcome for review",
  ];
}

/** Resolve checklist for a seed row (explicit override or defaults). */
export function nextActionsForSeedSpec(
  spec: Pick<OpsScheduleSeedSpec, "kind" | "status" | "title" | "sourceRef" | "nextActions">,
): string[] {
  if (spec.nextActions?.length) {
    return spec.nextActions.map((a) => a.trim()).filter(Boolean);
  }
  return defaultNextActionsFor(spec);
}

/** Build a short synopsis for a staged briefing-queue filename. */
export function synopsisForQueueDraft(filename: string): string {
  const base = filename.replace(/\.md$/i, "");
  if (/medshield/i.test(base)) {
    return "Medshield demo-tenant narrate dump — not a public GF promote candidate (auto-calendar skipped).";
  }
  if (/regulatory-delta/i.test(base)) {
    return "Legacy fixture name — should not appear in queue (moved to docs/governance-frame/fixtures/).";
  }
  if (/market-grc-2000-2008/i.test(base)) {
    return "Historical GRC market draft (2000–2008) — review for archive or research reuse.";
  }
  if (/market-grc-2009-2018/i.test(base)) {
    return "Historical GRC market draft (2009–2018) — review for archive or research reuse.";
  }
  if (/market-grc-2019/i.test(base)) {
    return "Historical GRC market draft (2019–today) — review for archive or research reuse.";
  }
  if (/auto-newsletter/i.test(base)) {
    return "Autonomous GTM newsletter draft in quarantine — Ops promote or deny only.";
  }
  if (/newsletter/i.test(base)) {
    return "Staged industry newsletter draft — fact-check citations, then promote or deny.";
  }
  if (/desk-note|draft-signal/i.test(base)) {
    return "Staged GF desk note — short dated signal; Approve on Publishing Desk → Desk notes (Tue 18:00 UTC publish window).";
  }
  if (/research/i.test(base)) {
    return "Staged research briefing draft — Ops review citations and product boundary, then promote or deny.";
  }
  return `Staged queue draft (${base}) — Ops review before any public publish.`;
}

/** Summer 2026 Governance Frame slate — idempotent by sourceRef+kind. */
export function summer2026SeedSpecs(): OpsScheduleSeedSpec[] {
  return [
    {
      title: "CPS 230 briefing — Ops review complete",
      kind: "BRIEFING_REVIEW",
      status: "DONE",
      dueAt: "2026-06-20T17:00:00.000Z",
      sourceRef: "2026-06-16-draft-research-cps-230-msp-contracts.md",
      synopsis:
        "AU research briefing on CPS 230 material service-provider contracts, fourth parties, and exit risk.",
      outcome:
        "DONE + archived 2026-08-04. Promoted to docs/published-briefings/2026-06-16-research-cps-230-msp-contracts.md; queue + quarantine drafts removed; listed in public/rss.xml. Canonical: research.ironframegrc.com/briefings/2026-06-16-research-cps-230-msp-contracts.",
    },
    {
      title: "AUSTRAC Tranche 2 newsletter — July reframe & promote",
      kind: "NEWSLETTER_REVIEW",
      status: "DONE",
      dueAt: "2026-07-25T17:00:00.000Z",
      sourceRef: "2026-06-16-draft-newsletter-austrac-tranche-2.md",
      synopsis:
        "AU industry newsletter on Tranche 2 AML/CTF — June ops language cleared; still quarantined. Reframe for post-1 July enrolment window, then desk + Approve.",
      outcome:
        "DONE + archived 2026-08-04. Promoted to docs/published-briefings/2026-06-16-newsletter-austrac-tranche-2.md; queue removed. Canonical: research.ironframegrc.com/briefings/2026-06-16-newsletter-austrac-tranche-2.",
    },
    {
      title: "DORA supervision briefing — Ops review & promote",
      kind: "BRIEFING_REVIEW",
      status: "DONE",
      dueAt: "2026-08-09T17:00:00.000Z",
      sourceRef: "2026-07-16-draft-research-dora-supervision.md",
      synopsis:
        "EU research briefing on DORA moving from implementation to competent-authority supervision — review citations, then promote.",
      outcome:
        "DONE 2026-08-06 — Promoted after citation revise. Canonical: https://research.ironframegrc.com/briefings/2026-07-16-research-dora-supervision · docs/published-briefings/2026-07-16-research-dora-supervision.md",
      nextActions: [
        "Open DORA supervision quarantine draft",
        "Verify citations — supervision readiness, not a fictional EU-wide year-two exam",
        "Promote or Deny; mark Done with outcome",
      ],
    },
    {
      title: "CSRD / Omnibus ESRS newsletter — Ops review & promote",
      kind: "NEWSLETTER_REVIEW",
      status: "DONE",
      dueAt: "2026-07-24T17:00:00.000Z",
      sourceRef: "2026-07-16-draft-newsletter-csrd-omnibus-esrs.md",
      synopsis:
        "EU industry newsletter on CSRD after Omnibus I and revised ESRS — verify OJ/application dates before promote.",
      outcome:
        "DONE + archived 2026-08-04. Promoted to docs/published-briefings/2026-07-16-newsletter-csrd-omnibus-esrs.md; queue removed. Canonical: research.ironframegrc.com/briefings/2026-07-16-newsletter-csrd-omnibus-esrs.",
    },
    {
      title: "EU AI Act August 2 briefing — final fact-check",
      kind: "BRIEFING_REVIEW",
      status: "PLANNED",
      dueAt: "2026-08-17T17:00:00.000Z",
      sourceRef: "2026-08-02-draft-research-eu-ai-act-august.md",
      synopsis:
        "EU research briefing for 2 Aug 2026 — confirm what applies vs Omnibus high-risk deferrals before Ops approve.",
      nextActions: [
        "Fact-check what applies on 2 Aug vs Omnibus high-risk deferrals",
        "Confirm Article 50 / transparency language",
        "Clear for publish window or request revisions",
      ],
    },
    {
      title: "EU AI Act briefing — publish window",
      kind: "BRIEFING_DRAFT",
      status: "PLANNED",
      dueAt: "2026-08-20T17:00:00.000Z",
      sourceRef: "2026-08-02-draft-research-eu-ai-act-august.md#publish",
      synopsis:
        "Publish the AI Act briefing after final fact-check passes (rescheduled from 2 Aug threshold; intervals preserved).",
      nextActions: [
        "Confirm final fact-check activity is Done",
        "Publish in the scheduled publish window",
        "Mark Done with publish slug/URL",
      ],
    },
    {
      title: "SEC Item 1.05 filings newsletter — Ops review",
      kind: "NEWSLETTER_REVIEW",
      status: "DONE",
      dueAt: "2026-08-12T17:00:00.000Z",
      sourceRef: "2026-08-16-draft-newsletter-sec-item-105-filings.md",
      synopsis:
        "US newsletter analyzing Item 1.05 cyber disclosure filing patterns and materiality — re-verify EDGAR examples before promote.",
      outcome:
        "DONE + archived 2026-08-04 (early promote vs Aug 16 edition date). EDGAR-verified revise applied; promoted to docs/published-briefings/2026-08-16-newsletter-sec-item-105-filings.md; queue + quarantine drafts removed. Canonical: research.ironframegrc.com/briefings/2026-08-16-newsletter-sec-item-105-filings.",
    },
    {
      title: "SEC cyber disclosure newsletter — syndicate",
      kind: "NEWSLETTER_SYNDICATE",
      status: "DONE",
      dueAt: "2026-08-16T17:00:00.000Z",
      sourceRef: "2026-08-16-draft-newsletter-sec-item-105-filings.md#syndicate",
      synopsis:
        "After promote, syndicate the SEC cyber disclosure newsletter to distribution channels.",
      outcome:
        "DONE + archived 2026-08-04. Item present in public/rss.xml with research.ironframegrc.com deep link; published ledger is the syndication source of truth.",
    },
  ];
}

/**
 * Ironframe public video campaign — When Risk Enters the Room.
 * Plan: docs/marketing-strategy/video-series/when-risk-enters-the-room.md
 */
export function videoCampaign2026SeedSpecs(): OpsScheduleSeedSpec[] {
  return [
    {
      title: "Video Phase 0 — Style lock complete",
      kind: "OPS_GENERAL",
      status: "PLANNED",
      dueAt: "2026-08-09T18:00:00.000Z",
      sourceRef: "video-series/when-risk-enters-the-room#phase-0",
      synopsis:
        "Lock character refs, boardroom stills, title/end cards, and V1–V2 shot lists before episode production spend. Working pack: /docs/marketing-strategy/video-series/v1-production-script",
      href: "/docs/marketing-strategy/video-series/v1-production-script",
    },
    {
      title: "Video V1 — The Risk Register (build)",
      kind: "OPS_GENERAL",
      status: "PLANNED",
      dueAt: "2026-09-16T18:00:00.000Z",
      sourceRef: "video-series/when-risk-enters-the-room#v1-build",
      synopsis:
        "Produce Episode 1 (The Number / risk register) clips for scheduled publish — Phase 1 budget ~$200. [2026-08-20] Rescheduled to Wed Sep 16 — +1 month from prior due Sun Aug 16 (cash discipline until Path B closes).",
    },
    {
      title: "Video V1 — Publish The Number",
      kind: "OPS_GENERAL",
      status: "PLANNED",
      dueAt: "2026-09-21T16:00:00.000Z",
      sourceRef: "video-series/when-risk-enters-the-room#v1-publish",
      synopsis:
        "Ship Episode 1 to LinkedIn + /marketing with CTA to a 10–15 min workflow review. [2026-08-20] Rescheduled to Mon Sep 21 — keeps publish after V1 build (Sep 16).",
    },
    {
      title: "Video V2 — The Audit Request (build)",
      kind: "OPS_GENERAL",
      status: "PLANNED",
      dueAt: "2026-08-30T18:00:00.000Z",
      sourceRef: "video-series/when-risk-enters-the-room#v2-build",
      synopsis:
        "Produce Episode 2 (The Evidence / audit request) and freeze the style pack after edit. [2026-08-24] Rescheduled +1 week from prior due Sun Aug 23 (Path B outreach + cash discipline).",
    },
    {
      title: "Video V2 — Publish The Evidence",
      kind: "OPS_GENERAL",
      status: "PLANNED",
      dueAt: "2026-08-28T16:00:00.000Z",
      sourceRef: "video-series/when-risk-enters-the-room#v2-publish",
      synopsis:
        "Ship Episode 2 pointing to /product-demo and audit-ready evidence solutions.",
    },
    {
      title: "Video V3 — Build The Boundary",
      kind: "OPS_GENERAL",
      status: "PLANNED",
      dueAt: "2026-08-29T18:00:00.000Z",
      sourceRef: "video-series/when-risk-enters-the-room#v3-build",
      href: "/docs/marketing-strategy/video-series/v3-kickoff-phase2-shotlist",
      priorityHint: 18,
      synopsis:
        "V3 pack published (c6ca922c). Shot 02 keyframe + Flow card ready in Videos/WhenRisk/V3/raw. Generate clip next. [2026-08-24] Rescheduled +1 week from prior due Sat Aug 22.",
    },
    {
      title: "Video Phase 2 — V3/V4/V5 production window",
      kind: "OPS_GENERAL",
      status: "PLANNED",
      dueAt: "2026-09-02T18:00:00.000Z",
      sourceRef: "video-series/when-risk-enters-the-room#phase-2",
      synopsis:
        "Start Episodes 3–5 (Boundary, Draft, Intake) production window for Sep publishes.",
    },
    {
      title: "Video V3 — Publish The Boundary",
      kind: "OPS_GENERAL",
      status: "PLANNED",
      dueAt: "2026-09-11T16:00:00.000Z",
      sourceRef: "video-series/when-risk-enters-the-room#v3-publish",
      synopsis:
        "Ship Episode 3 on multi-entity / boundary control with workflow-review CTA.",
    },
    {
      title: "Video V4 — Publish The Draft",
      kind: "OPS_GENERAL",
      status: "PLANNED",
      dueAt: "2026-09-18T16:00:00.000Z",
      sourceRef: "video-series/when-risk-enters-the-room#v4-publish",
      synopsis:
        "Ship Episode 4 on governed AI drafts — AI never self-approves.",
    },
    {
      title: "Video V5 — Publish The Intake",
      kind: "OPS_GENERAL",
      status: "PLANNED",
      dueAt: "2026-09-25T16:00:00.000Z",
      sourceRef: "video-series/when-risk-enters-the-room#v5-publish",
      synopsis:
        "Ship Episode 5 on Irongate sanitize-before-persist intake narrative.",
    },
    {
      title: "Video V6 — Complete Story (build)",
      kind: "OPS_GENERAL",
      status: "PLANNED",
      dueAt: "2026-10-11T18:00:00.000Z",
      sourceRef: "video-series/when-risk-enters-the-room#v6-build",
      synopsis:
        "Finish the 2–3 min complete Ironframe story film for mid-Oct publish.",
    },
    {
      title: "Video V6 — Publish Complete Ironframe Story",
      kind: "OPS_GENERAL",
      status: "PLANNED",
      dueAt: "2026-10-16T16:00:00.000Z",
      sourceRef: "video-series/when-risk-enters-the-room#v6-publish",
      synopsis:
        "Ship the complete story to LinkedIn, homepage, and newsletter with workflow-review CTA.",
    },
  ];
}

/**
 * Ironframe commercial rollout — design-partner Path B, FL2, GTM-3.
 */
export function ironframeRollout2026SeedSpecs(): OpsScheduleSeedSpec[] {
  return [
    {
      title: "Rollout — FL1 Pilot-ready exit (PASS)",
      kind: "OPS_GENERAL",
      status: "DONE",
      dueAt: "2026-07-13T17:00:00.000Z",
      sourceRef: "rollout/fl1-pilot-ready",
      synopsis:
        "Pilot-to-commercial FL1 exit gate — baseline before Path B design-partner outreach.",
      outcome:
        "FL1 Pilot-ready PASSED on 2026-07-13 per docs/ops/pilot-to-commercial-readiness-checklist.md. Path B outreach may proceed once remaining pre-outreach gates clear.",
    },
    {
      title: "Rollout — Pre-outreach gate (A1–A4 launch checklist)",
      kind: "OPS_GENERAL",
      status: "DONE",
      dueAt: "2026-07-22T17:00:00.000Z",
      sourceRef: "rollout/dp-pre-outreach-gate",
      synopsis:
        "Clear A1–A4 on the design-partner operator launch checklist before any outbound batch.",
      outcome:
        "PASS 2026-07-19 — A1–A4 on design-partner-operator-launch-checklist.md all clear (contact lead-only; Path B test Checkout mint; Resend+Textbelt; offer/sequence locks).",
    },
    {
      title: "Rollout — SMS DISPATCH / Twilio smoke",
      kind: "OPS_GENERAL",
      status: "DONE",
      dueAt: "2026-07-22T17:00:00.000Z",
      sourceRef: "rollout/sms-dispatch-smoke",
      synopsis:
        "Prove SalesTeam SMS DISPATCH via Twilio end-to-end before first live outreach batch.",
      outcome:
        "PASS 2026-07-19 — A3: SMS path ready via Textbelt (quota≈199); Resend ironframegrc.com verified. Twilio not required for current DISPATCH provider.",
    },
    {
      title: "Rollout — ICP shortlist + warm intros batch",
      kind: "OPS_GENERAL",
      status: "DONE",
      dueAt: "2026-07-25T17:00:00.000Z",
      sourceRef: "rollout/dp-icp-shortlist",
      synopsis:
        "Finalize Path B ICP shortlist and warm-intro targets for design-partner recruitment.",
      outcome:
        "PASS 2026-07-19 — B1 ICP shortlist filled (attack order + §C research); B3 prospect-pool has Pivot Point + BlueRadius PROSPECTs. Warm A1–A5 slots empty by design (no warm network).",
    },
    {
      title: "Rollout — Golden Path regression smoke (Stops 1–5)",
      kind: "OPS_GENERAL",
      status: "DONE",
      dueAt: "2026-07-24T17:00:00.000Z",
      sourceRef: "rollout/golden-path-regression",
      synopsis:
        "Re-run Golden Path Stops 1–5 so production demo path is green before DP outreach.",
      outcome:
        "DONE + archived 2026-08-04. Golden Path Run #4 (2026-07-10) PASS — Stops 1–5b + optional Stop 6 per docs/ops/golden-path-checklist.md; Item 1A PASS on pilot-to-commercial-readiness-checklist.md.",
    },
    {
      title: "Rollout — Partner client provisioning (1D) walkthrough",
      kind: "OPS_GENERAL",
      status: "CANCELLED",
      dueAt: "2026-07-28T17:00:00.000Z",
      sourceRef: "rollout/partner-client-provisioning-1d",
      synopsis:
        "Walk the 1D partner→client provisioning path so first design partners can be onboarded cleanly.",
      outcome:
        "DEFERRED 2026-08-06 — Local eng PA-PART.A/B PASS; PA-PART.C assign-provisioner + prod walkthrough waits on a real partner email. Re-seed / reopen when ready for ops:assign-partner-provisioner.",
    },
    {
      title: "Rollout — First SalesTeam DISPATCH batch",
      kind: "OPS_GENERAL",
      status: "DONE",
      dueAt: "2026-08-24T15:00:00.000Z",
      sourceRef: "rollout/first-salesteam-dispatch",
      synopsis:
        "Board-first HITL outbound batch to the Path B design-partner cohort. [2026-08-15] Kept Mon Aug 24 — same day as cold outreach gate.",
      outcome:
        "PASS 2026-08-24 — First Path B HITL DISPATCH batch sent. Touch 1 (5): CyberGuard, CyberSheath, Cycurion, Cyturity, Dark Rhino. Touch 2 (5): Abacus, Absolute Logic, Agio/Netrio, Alvarez, AMSYS. Cold outreach gate cleared same day.",
    },
    {
      title: "Rollout — 2A Stripe subscription lifecycle PASS",
      kind: "OPS_GENERAL",
      status: "PLANNED",
      dueAt: "2026-09-28T17:00:00.000Z",
      sourceRef: "rollout/fl2-2a-stripe-lifecycle",
      synopsis:
        "FL2 commercial gate: prove Stripe subscription create/update/cancel lifecycle PASS. Rescheduled to Mon Sep 28 (was Aug 8).",
    },
    {
      title: "Rollout — 2B entitlement matrix PASS",
      kind: "OPS_GENERAL",
      status: "PLANNED",
      dueAt: "2026-09-14T17:00:00.000Z",
      sourceRef: "rollout/fl2-2b-entitlement-matrix",
      synopsis:
        "FL2 commercial gate: entitlement matrix matches SKU/plan access for paying partners. [2026-08-15] Rescheduled to Mon Sep 14 (was Aug 15).",
    },
    {
      title: "Rollout — 2C public SKU / pricing align",
      kind: "OPS_GENERAL",
      status: "PLANNED",
      dueAt: "2026-08-15T17:00:00.000Z",
      sourceRef: "rollout/fl2-2c-sku-pricing",
      synopsis:
        "Align public Path B SKU/pricing ($4,999 / 90-day default) with checkout and sales materials.",
    },
    {
      title: "Rollout — First paying Path B design partner ACTIVE",
      kind: "OPS_GENERAL",
      status: "PLANNED",
      dueAt: "2026-09-21T17:00:00.000Z",
      sourceRef: "rollout/phase-b-first-live-partner",
      synopsis:
        "Land first paying Path B design partner ACTIVE (market-entrance Phase B). [2026-08-19] Rescheduled to Mon Sep 21 — +1 month from prior due Thu Aug 20 (after first HITL DISPATCH wave starts).",
    },
    {
      title: "Rollout — 2D second prod reference + in-tenant support",
      kind: "OPS_GENERAL",
      status: "PLANNED",
      dueAt: "2026-09-05T17:00:00.000Z",
      sourceRef: "rollout/fl2-2d-second-reference",
      synopsis:
        "FL2 evidence: second production reference tenant plus working in-tenant support path.",
    },
    {
      title: "Rollout — FL2 Commercial-ready exit",
      kind: "OPS_GENERAL",
      status: "PLANNED",
      dueAt: "2026-09-12T17:00:00.000Z",
      sourceRef: "rollout/fl2-commercial-ready",
      synopsis:
        "Exit FL2 Commercial-ready when 2A–2D gates and Path B evidence are complete.",
    },
    {
      title: "Rollout — GTM-3 three paying design partners",
      kind: "OPS_GENERAL",
      status: "PLANNED",
      dueAt: "2026-09-30T17:00:00.000Z",
      sourceRef: "rollout/gtm-3-three-partners",
      synopsis:
        "GTM cohort target: three paying design partners live under Path B terms.",
    },
    {
      title: "Rollout — Stripe CREDENTIAL_MODE live flip (pre commercial GA)",
      kind: "OPS_GENERAL",
      status: "PLANNED",
      dueAt: "2026-09-10T17:00:00.000Z",
      sourceRef: "rollout/stripe-live-mode-flip",
      synopsis:
        "Flip Stripe CREDENTIAL_MODE to live before commercial GA charges — controlled ops gate.",
    },
  ];
}

/** GF-2026-001 Evolution of GRC research paper publish path. */
export function researchPaper2026SeedSpecs(): OpsScheduleSeedSpec[] {
  return [
    {
      title: "GF-2026-001 — Editorial + regulatory-scope review",
      kind: "RESEARCH_PAPER",
      status: "DONE",
      dueAt: "2026-07-28T17:00:00.000Z",
      sourceRef: "research/GF-2026-001#editorial-review",
      synopsis:
        "Editorial and regulatory-scope review of the Evolution of GRC research paper before product-boundary check.",
      outcome:
        "PASS 2026-08-05 — Editorial + regulatory-scope re-read OK per revision-history.md 1.5-review. Calendar catch-up 2026-08-06.",
    },
    {
      title: "GF-2026-001 — Product-boundary review",
      kind: "RESEARCH_PAPER",
      status: "DONE",
      dueAt: "2026-08-01T17:00:00.000Z",
      sourceRef: "research/GF-2026-001#product-boundary",
      synopsis:
        "Ensure the public paper stays institutional GRC analysis — no Ironframe product CTA leakage.",
      outcome:
        "PASS 2026-08-05 — No Ironframe/Path B/product CTA leakage (grep). Boundary PASS with editorial in 1.5-review. Calendar catch-up 2026-08-06.",
    },
    {
      title: "GF-2026-001 — Operator Approve / publish",
      kind: "RESEARCH_PAPER",
      status: "DONE",
      dueAt: "2026-08-25T17:00:00.000Z",
      sourceRef: "research/GF-2026-001#publish",
      synopsis:
        "Human-only Approve/publish after editorial and product-boundary reviews both pass. Manuscript status PUBLISHED for public research catalog.",
      outcome:
        "PASS 2026-08-25 — GF-2026-001 v1.6 PUBLISHED. Chapter 5 aligned to Jul 15 current-pain claim-hygiene; companion briefs linked. Public slug: /research-papers/GF-2026-001-evolution-of-grc (and research.ironframegrc.com mirror when deployed).",
      href: "/docs/governance-frame/research-papers/GF-2026-001-evolution-of-grc/manuscript",
    },
  ];
}

/** Staged queue drafts outside the named summer slate. */
export function queueBacklog2026SeedSpecs(): OpsScheduleSeedSpec[] {
  return [
    {
      title: "Queue — Review GRC evolution research draft",
      kind: "BRIEFING_REVIEW",
      status: "DONE",
      dueAt: "2026-07-23T17:00:00.000Z",
      sourceRef: "2026-07-15-draft-research-grc-evolution.md",
      synopsis:
        "Quarantined research on how GRC evolved — Ops promote or deny after citation check.",
      outcome:
        "DONE + archived 2026-08-04. Promoted to docs/published-briefings/2026-07-15-research-grc-evolution.md; queue removed. Canonical: research.ironframegrc.com/briefings/2026-07-15-research-grc-evolution.",
    },
    {
      title: "Queue — Review GRC current-pain research draft",
      kind: "BRIEFING_REVIEW",
      status: "DONE",
      dueAt: "2026-07-23T17:00:00.000Z",
      sourceRef: "2026-07-15-draft-research-grc-current-pain.md",
      synopsis:
        "Quarantined research on current GRC operator pain — Ops promote or deny after citation check.",
      outcome:
        "DONE + archived 2026-08-04. Promoted to docs/published-briefings/2026-07-15-research-grc-current-pain.md; queue removed. Canonical: research.ironframegrc.com/briefings/2026-07-15-research-grc-current-pain.",
    },
    {
      title: "Queue — Review stakeholder benefit-map draft",
      kind: "BRIEFING_REVIEW",
      status: "CANCELLED",
      dueAt: "2026-07-24T17:00:00.000Z",
      sourceRef: "2026-07-15-draft-research-stakeholder-benefit-map.md",
      synopsis:
        "Stakeholder benefit-map draft is product-boundary heavy — review carefully before any promote.",
      outcome:
        "CANCELLED 2026-08-05 — Product-boundary heavy (Ironframe capability mapping). Kept as quarantined internal research; not promoted to GF public ledger. Re-open only after institutional rewrite strips product CTA/alleviation frames. Calendar catch-up 2026-08-06.",
    },
    {
      title: "Queue — Review auto-newsletter: tenant sovereignty",
      kind: "NEWSLETTER_REVIEW",
      status: "DONE",
      dueAt: "2026-07-21T17:00:00.000Z",
      sourceRef: "2026-07-15-draft-auto-newsletter-tenant-sovereignty.md",
      synopsis:
        "Autonomous GTM newsletter on tenant sovereignty — Ops promote or deny only.",
      outcome:
        "DENIED from queue. Auto Ironcast GTM draft removed; product substance remains in internal docs / published sovereign-enclaves material — not a GF newsletter queue item.",
    },
    {
      title: "Queue — Review auto-newsletter: design-partner cohort",
      kind: "NEWSLETTER_REVIEW",
      status: "DONE",
      dueAt: "2026-07-21T17:00:00.000Z",
      sourceRef: "2026-07-16-draft-auto-newsletter-design-partner-cohort.md",
      synopsis:
        "Autonomous GTM newsletter on the design-partner cohort — Ops promote or deny only.",
      outcome:
        "DENIED from queue. Auto Ironcast GTM draft removed; Path B / design-partner substance remains in internal sales/product docs — not a GF newsletter queue item.",
    },
    {
      title: "Queue — Review Medshield draft (demo-tenant boundary)",
      kind: "BRIEFING_REVIEW",
      status: "DONE",
      dueAt: "2026-07-21T17:00:00.000Z",
      sourceRef: "2026-07-18-draft-medshield.md",
      synopsis:
        "Medshield draft may touch demo-tenant material — confirm non-confidential before any public path.",
      outcome:
        "DENIED/PURGED. Raw Medshield demo-tenant narrate output removed (tenant UUID / ALE / multi-segment baselines). Never treated as a GF public briefing; tenant-isolation bounds preserved.",
    },
    {
      title: "Queue — Archive/deny stale CF-GRC Part 1–3 mirrors",
      kind: "OPS_GENERAL",
      status: "DONE",
      dueAt: "2026-07-21T17:00:00.000Z",
      sourceRef: "queue/archive-cf-grc-mirrors",
      synopsis:
        "Clear stale CF-GRC Parts 1–3 queue mirrors after the canonical series already published.",
      outcome:
        "Market GRC Parts 1–3 queue mirrors DENIED/REMOVED as duplicates. Canonical CF-GRC Parts 1–3 remain locked in the published ledger (2026-07-16).",
    },
    {
      title: "Review briefing draft: 2026-08-18-draft-auto-briefing-heatmap-vs-dollars.md",
      kind: "BRIEFING_REVIEW",
      status: "CANCELLED",
      dueAt: "2026-08-19T17:00:00.000Z",
      sourceRef: "2026-08-18-draft-auto-briefing-heatmap-vs-dollars.md",
      synopsis:
        "Staged queue draft (2026-08-18-draft-auto-briefing-heatmap-vs-dollars) — Ops review before any public publish.",
      outcome:
        "CANCELLED 2026-08-19 — Theme already live via founder LinkedIn (heatmap vs dollars) + Heatmap Amnesty desk note lane; no separate auto-briefing promote.",
    },
    {
      title: "Review newsletter draft: 2026-08-18-draft-auto-newsletter-heatmap-vs-dollars.md",
      kind: "NEWSLETTER_REVIEW",
      status: "CANCELLED",
      dueAt: "2026-08-19T17:00:00.000Z",
      sourceRef: "2026-08-18-draft-auto-newsletter-heatmap-vs-dollars.md",
      synopsis:
        "Autonomous GTM newsletter draft in quarantine — Ops promote or deny only.",
      outcome:
        "CANCELLED 2026-08-19 — Theme already live via founder LinkedIn (heatmap vs dollars) + Heatmap Amnesty desk note lane; no separate auto-newsletter promote.",
    },
    {
      title: "Review briefing draft: 2026-08-19-draft-auto-briefing-tenant-sovereignty.md",
      kind: "BRIEFING_REVIEW",
      status: "CANCELLED",
      dueAt: "2026-08-20T17:00:00.000Z",
      sourceRef: "2026-08-19-draft-auto-briefing-tenant-sovereignty.md",
      synopsis:
        "Staged queue draft (2026-08-19-draft-auto-briefing-tenant-sovereignty) — Ops review before any public publish.",
      outcome:
        "DENIED 2026-08-20 — Claim-hygiene rewrite applied on disk; moved to docs/ops/denied-rewrites/. Not promoted.",
    },
    {
      title: "Review newsletter draft: 2026-08-19-draft-auto-newsletter-tenant-sovereignty.md",
      kind: "NEWSLETTER_REVIEW",
      status: "CANCELLED",
      dueAt: "2026-08-20T17:00:00.000Z",
      sourceRef: "2026-08-19-draft-auto-newsletter-tenant-sovereignty.md",
      synopsis:
        "Autonomous GTM newsletter draft in quarantine — Ops promote or deny only.",
      outcome:
        "DENIED 2026-08-20 — Duplicate tenant-sovereignty theme; denied with briefing pair. Moved to docs/ops/denied-rewrites/.",
    },
    {
      title: "Review briefing draft: 2026-08-24-draft-auto-briefing-tenant-sovereignty.md",
      kind: "BRIEFING_REVIEW",
      status: "CANCELLED",
      dueAt: "2026-08-25T17:00:00.000Z",
      sourceRef: "2026-08-24-draft-auto-briefing-tenant-sovereignty.md",
      synopsis:
        "Staged queue draft (2026-08-24-draft-auto-briefing-tenant-sovereignty) — Ops review before any public publish.",
      outcome:
        "CANCELLED 2026-08-24 — Duplicate tenant-sovereignty auto-run; Aug 19 pair already denied. No file in queue; card closed.",
    },
    {
      title: "Review newsletter draft: 2026-08-24-draft-auto-newsletter-tenant-sovereignty.md",
      kind: "NEWSLETTER_REVIEW",
      status: "CANCELLED",
      dueAt: "2026-08-25T17:00:00.000Z",
      sourceRef: "2026-08-24-draft-auto-newsletter-tenant-sovereignty.md",
      synopsis:
        "Autonomous GTM newsletter draft in quarantine — Ops promote or deny only.",
      outcome:
        "CANCELLED 2026-08-24 — Duplicate tenant-sovereignty auto-run; Aug 19 pair already denied. No file in queue; card closed.",
    },
    {
      title: "Review newsletter — Control-First GRC: When Evidence Collection Becomes Evidence Theater",
      kind: "NEWSLETTER_REVIEW",
      status: "CANCELLED",
      dueAt: "2026-08-25T17:00:00.000Z",
      sourceRef: "2026-08-06-draft-newsletter-control-first-evidence-theater.md",
      synopsis:
        "Superseded Aug 06 Control-First queue draft — use marketing/control-first-newsletter-aug#review + 2026-08-28 queue file.",
      outcome:
        "CANCELLED 2026-08-24 — Superseded by 2026-08-28 queue rewrite. Manuscript archived under docs/ops/denied-rewrites/; use marketing/control-first-newsletter-aug#review only.",
    },
    {
      title: "Review newsletter — Control-First evidence theater (queue)",
      kind: "NEWSLETTER_REVIEW",
      status: "CANCELLED",
      dueAt: "2026-08-25T17:00:00.000Z",
      sourceRef: "2026-08-28-draft-newsletter-control-first-evidence-theater.md",
      synopsis:
        "Auto queue-review duplicate — canonical card is marketing/control-first-newsletter-aug#review (same manuscript).",
      outcome:
        "CANCELLED 2026-08-24 — Duplicate auto queue-review card; canonical review is marketing/control-first-newsletter-aug#review (same manuscript).",
    },
  ];
}

/**
 * Weekday founder LinkedIn network hygiene (10–15 min).
 * Starts 2026-08-20 through 2026-09-18. sourceRef avoids `marketing/linkedin*`
 * so these cards do not create Publishing Desk draft slots.
 */
export function founderLinkedInNetworkHygiene2026SeedSpecs(): OpsScheduleSeedSpec[] {
  const start = new Date("2026-08-20T16:00:00.000Z");
  const end = new Date("2026-09-18T16:00:00.000Z");
  const specs: OpsScheduleSeedSpec[] = [];
  const day = new Date(start);
  while (day.getTime() <= end.getTime()) {
    const dow = day.getUTCDay(); // 0 Sun … 6 Sat
    if (dow >= 1 && dow <= 5) {
      const y = day.getUTCFullYear();
      const m = String(day.getUTCMonth() + 1).padStart(2, "0");
      const d = String(day.getUTCDate()).padStart(2, "0");
      const isoDate = `${y}-${m}-${d}`;
      const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][dow]!;
      specs.push({
        title: `LinkedIn network — ${weekday} ${isoDate}`,
        kind: "OPS_GENERAL",
        status: "PLANNED",
        dueAt: `${isoDate}T16:00:00.000Z`,
        sourceRef: `marketing/founder-li-network-${isoDate}`,
        href: "https://www.linkedin.com/feed/",
        priorityHint: 22,
        synopsis:
          "Daily 10–15 min: prune noise, ≤3 peer engages (no pitch), 3–5 Path B–fit connects with a 1-line note. Separate from Mon/Wed/Fri posts.",
        nextActions: [
          "Prune spam / non-ICP suggested noise (2 min)",
          "Engage ≤3 peers (comment/react/reply) — no Ironframe pitch",
          "Send 3–5 Path B–fit connection requests with a 1-line personal note",
          "Mark Done (outcome: connects sent / notable threads)",
        ],
      });
    }
    day.setUTCDate(day.getUTCDate() + 1);
  }
  return specs;
}

/**
 * Free marketing + gates before cold Path B outreach.
 * Intentional priorityHints keep this pack ahead of later FL2/video work.
 */
export function preOutreachMarketing2026SeedSpecs(): OpsScheduleSeedSpec[] {
  return [
    {
      title: "Marketing — Spot-check live credibility surfaces",
      kind: "OPS_GENERAL",
      status: "DONE",
      dueAt: "2026-07-20T17:00:00.000Z",
      sourceRef: "marketing/live-surfaces-credibility-spotcheck",
      priorityHint: 1,
      synopsis:
        "Before outreach: verify /marketing, /product-demo, Trust Center, contact, and published GF briefings look coherent.",
      outcome:
        "PASS 2026-07-18 — A1 prod spot-check: /register/contact lead-only; onboarding Path B label; get-started GRC≠CRM; public credibility surfaces coherent.",
    },
    {
      title: "Marketing — Confirm Path B Stripe activation checkout",
      kind: "OPS_GENERAL",
      status: "DONE",
      dueAt: "2026-07-20T18:00:00.000Z",
      sourceRef: "marketing/path-b-stripe-activation-confirm",
      priorityHint: 2,
      synopsis:
        "Pre-outreach checklist: tenant-scoped Path B activation is live; never send PENDING partners to generic /pricing.",
      outcome:
        "PASS 2026-07-19 — A2: Stripe test Checkout Session minted for throwaway slug via scripts/dev/a2-pathb-activation-dry-run.mjs ($4,999 Path B); live refused; never send PENDING to generic /pricing.",
    },
    {
      title: "LinkedIn Mon — Heatmap theater vs dollar-risk clarity",
      kind: "OPS_GENERAL",
      status: "DONE",
      dueAt: "2026-08-06T20:00:00.000Z",
      sourceRef: "marketing/linkedin-2026-08-06-heatmap",
      href: "/dashboard/operations/publishing?desk=linkedin&li=mon-heatmap",
      priorityHint: 5,
      synopsis:
        "Founder LinkedIn (catch-up): paste heatmap vs estimated whole-cent exposure post from Publishing Desk → LinkedIn tab.",
      outcome:
        "DONE 2026-08-06 — Posted from Wil personal profile + Ironframe company Page amplify. Canonical desk slot: mon-heatmap (Published).",
    },
    {
      title: "LinkedIn Wed — point to /product-demo (pre-video)",
      kind: "OPS_GENERAL",
      status: "DONE",
      dueAt: "2026-08-11T15:00:00.000Z",
      sourceRef: "marketing/linkedin-2026-07-23",
      href: "/dashboard/operations/publishing?desk=linkedin&li=wed-product-demo",
      priorityHint: 6,
      synopsis:
        "Founder LinkedIn: Wednesday post to /product-demo ahead of rescheduled video demo publishes.",
      outcome:
        "DONE 2026-08-10 — Posted. Canonical desk slot: wed-product-demo (Published).",
    },
    {
      title: "LinkedIn Fri — Collection is not verification",
      kind: "OPS_GENERAL",
      status: "DONE",
      dueAt: "2026-08-08T15:00:00.000Z",
      sourceRef: "marketing/linkedin-2026-08-08-collection",
      href: "/dashboard/operations/publishing?desk=linkedin&li=fri-collection",
      priorityHint: 7,
      synopsis:
        "Founder LinkedIn: Friday control lesson — collection ≠ verification; hard tenant boundaries vs tag-only soft tenancy. CTA workflow review.",
      outcome:
        "DONE 2026-08-07 — Posted to LinkedIn. Canonical desk slot: fri-collection (Published).",
      nextActions: [
        "Paste Friday body from chat / desk draft",
        "Publish Fri from personal profile",
        "Mark Done with LinkedIn URL",
      ],
    },
    {
      title: "LinkedIn Wed — AI drafts are not evidence",
      kind: "OPS_GENERAL",
      status: "PLANNED",
      dueAt: "2026-08-12T20:00:00.000Z",
      sourceRef: "marketing/linkedin-2026-08-11-ai-evidence",
      href: "/dashboard/operations/publishing?desk=linkedin&li=2026-08-11-ai-evidence",
      priorityHint: 2,
      synopsis:
        "Founder LinkedIn (Wed): AI/agent output ≠ trusted evidence — quarantine + human promote gates. Mon–Wed–Fri cadence (moved from Tue 2026-08-11).",
      nextActions: [
        "Open Publishing Desk → LinkedIn (this calendar card)",
        "Verify research citations, Copy body → LinkedIn",
        "Paste first-comment CTA after publish",
        "Mark Done with LinkedIn URL",
      ],
    },
    {
      title: "LinkedIn Fri — Residual exposure vs mitigation spend",
      kind: "OPS_GENERAL",
      status: "PLANNED",
      dueAt: "2026-08-14T20:00:00.000Z",
      sourceRef: "marketing/linkedin-2026-08-14-residual",
      href: "/dashboard/operations/publishing?desk=linkedin&li=2026-08-14-residual",
      priorityHint: 3,
      synopsis:
        "Founder LinkedIn (Fri): Control-to-Capital lesson — spend → residual exposure with signed assumptions. Complements Mon heatmap without repeating color-vs-dollars.",
      nextActions: [
        "Open Publishing Desk → LinkedIn (this calendar card)",
        "Verify research citations, Copy body → LinkedIn",
        "Paste first-comment CTA after publish",
        "Mark Done with LinkedIn URL",
      ],
    },
    {
      title: "LinkedIn Mon — “Last audited” is not “working now”",
      kind: "OPS_GENERAL",
      status: "PLANNED",
      dueAt: "2026-08-17T20:00:00.000Z",
      sourceRef: "marketing/linkedin-2026-08-17-ccm",
      href: "/dashboard/operations/publishing?desk=linkedin&li=2026-08-17-ccm",
      priorityHint: 4,
      synopsis:
        "Founder LinkedIn (Mon): point-in-time audit packs vs continuous control proof — ‘last audited’ ≠ ‘working now.’ [2026-08-17] Restored to Mon Aug 17 (was briefly Aug 24).",
      nextActions: [
        "Open Publishing Desk → LinkedIn (this calendar card)",
        "Verify research citations, Copy body → LinkedIn",
        "Paste first-comment CTA after publish",
        "Mark Done with LinkedIn URL",
      ],
    },
    {
      title: "LinkedIn Wed — What changed since the last board packet?",
      kind: "OPS_GENERAL",
      status: "PLANNED",
      dueAt: "2026-08-19T20:00:00.000Z",
      sourceRef: "marketing/linkedin-2026-08-19-board-delta",
      href: "/dashboard/operations/publishing?desk=linkedin&li=2026-08-19-board-delta",
      priorityHint: 5,
      synopsis:
        "Founder LinkedIn (Wed): board-packet delta walkthrough — material risks, what changed, what decision. Points to /product-demo.",
      nextActions: [
        "Open Publishing Desk → LinkedIn (this calendar card)",
        "Verify research citations, Copy body → LinkedIn",
        "Paste first-comment CTA after publish",
        "Mark Done with LinkedIn URL",
      ],
    },
    {
      title: "LinkedIn Fri — Questionnaire ≠ continuous third-party assurance",
      kind: "OPS_GENERAL",
      status: "DONE",
      dueAt: "2026-08-21T20:00:00.000Z",
      sourceRef: "marketing/linkedin-2026-08-21-tprm",
      href: "/dashboard/operations/publishing?desk=linkedin&li=2026-08-21-tprm",
      priorityHint: 6,
      synopsis:
        "Founder LinkedIn (Fri): TPRM control lesson — vendor questionnaires ≠ continuous third-party assurance; DORA ICT third-party context.",
      outcome: "PASS 2026-08-21 — Published: https://lnkd.in/p/gs7VuRmg",
      nextActions: [
        "Open Publishing Desk → LinkedIn (this calendar card)",
        "Verify research citations, Copy body → LinkedIn",
        "Paste first-comment CTA after publish",
        "Mark Done with LinkedIn URL",
      ],
    },
    {
      title: "LinkedIn Mon — Shared-stack evidence registers",
      kind: "OPS_GENERAL",
      status: "PLANNED",
      dueAt: "2026-08-24T20:00:00.000Z",
      sourceRef: "marketing/linkedin-2026-08-24-shared-stack",
      href: "/dashboard/operations/publishing?desk=linkedin&li=2026-08-24-shared-stack",
      priorityHint: 4,
      synopsis:
        "Founder LinkedIn (Mon): multi-client GRC — row-level tags ≠ evidence register wall. MSSP/vCISO problem post; voice-pass 2026-08-24; cites May 14 enclaves briefing. Draft: linkedin-drafts-2026-08-24-shared-stack-evidence.md.",
      nextActions: [
        "Open Publishing Desk → LinkedIn (this calendar card)",
        "Verify research citations, Copy body → LinkedIn",
        "Paste first-comment CTA after publish",
        "Mark Done with LinkedIn URL",
      ],
    },
    {
      title: "LinkedIn Wed — Board reporting from a shared register",
      kind: "OPS_GENERAL",
      status: "PLANNED",
      dueAt: "2026-08-26T20:00:00.000Z",
      sourceRef: "marketing/linkedin-2026-08-26-board-export",
      href: "/dashboard/operations/publishing?desk=linkedin&li=2026-08-26-board-export",
      priorityHint: 5,
      synopsis:
        "Founder LinkedIn (Wed): entity-scoped export inspect path before board/customer assurance send. Points to /product-demo. Draft: linkedin-drafts-2026-08-26-board-export-isolation.md.",
      nextActions: [
        "Open Publishing Desk → LinkedIn (this calendar card)",
        "Verify research citations, Copy body → LinkedIn",
        "Paste first-comment CTA after publish",
        "Mark Done with LinkedIn URL",
      ],
    },
    {
      title: "LinkedIn Mon — ISO 27001 is not NIS2 compliance",
      kind: "OPS_GENERAL",
      status: "PLANNED",
      dueAt: "2026-08-31T20:00:00.000Z",
      sourceRef: "marketing/linkedin-2026-08-31-nis2-iso-accountability",
      href: "/dashboard/operations/publishing?desk=linkedin&li=2026-08-31-nis2-iso-accountability",
      priorityHint: 3,
      synopsis:
        "Founder LinkedIn (Mon problem post): certificate ≠ regulatory clocks ≠ named accountable party. Arts 20/21/23 of Directive (EU) 2022/2555 verified against EUR-Lex 2026-08-28. Points to /marketing. First comment: clocks→owners map + transposition caveat. Draft: linkedin-drafts-2026-08-31-nis2-iso-accountability.md. Moved off Fri 2026-08-28 (draft file had never been written).",
      nextActions: [
        "Open Publishing Desk → LinkedIn (this calendar card)",
        "Voice-pass body; confirm no legal-advice framing",
        "Verify research citations, Copy body → LinkedIn",
        "Paste first-comment clocks→owners map + CTA after publish",
        "Mark Done with LinkedIn URL",
      ],
    },
    {
      title: "LinkedIn Mon — Security debt shows up in deal valuation",
      kind: "OPS_GENERAL",
      status: "PLANNED",
      dueAt: "2026-09-15T20:00:00.000Z",
      sourceRef: "marketing/linkedin-2026-09-15-ma-security-debt",
      href: "/dashboard/operations/publishing?desk=linkedin&li=2026-09-15-ma-security-debt",
      priorityHint: 7,
      synopsis:
        "Founder LinkedIn (Mon): M&A/diligence angle — security debt in deal valuation (not Magerr copy; no engage). Soft overlap with enclaves; different job than soft-tenancy GF.",
      nextActions: [
        "Open Publishing Desk → LinkedIn (this calendar card)",
        "Voice-pass draft; verify independent citations (not Magerr)",
        "Copy body → LinkedIn; paste first-comment CTA after publish",
        "Mark Done with LinkedIn URL",
      ],
    },
    {
      title: "Marketing — Warm network / advisor asks (before cold)",
      kind: "OPS_GENERAL",
      status: "CANCELLED",
      dueAt: "2026-07-26T17:00:00.000Z",
      sourceRef: "marketing/warm-network-advisor-asks",
      priorityHint: 8,
      synopsis:
        "Fastest first doors: ask warm network who has board-risk / evidence friction — before cold co-builder batch.",
      outcome:
        "N/A 2026-07-19 — B2: no warm network / advisor intros available; deferred until a real intro appears. Cold path proceeds from prospect-pool.",
    },
    {
      title: "Marketing — Cold outreach gate (after free marketing)",
      kind: "OPS_GENERAL",
      status: "DONE",
      dueAt: "2026-08-24T15:00:00.000Z",
      sourceRef: "marketing/cold-outreach-gate",
      priorityHint: 11,
      synopsis:
        "Do not start cold Path B DISPATCH until LinkedIn week-1 + pre-outreach checklist + live surfaces pass. [2026-08-15] Rescheduled to Mon Aug 24 — week-1 LinkedIn and Video Phase 0 are DONE; keep gate with first DISPATCH (Canada CRM still not promote-ready).",
      outcome:
        "PASS 2026-08-24 — Cold outreach gate cleared for US MSSP HITL continuation. LinkedIn week-1 Mon/Wed/Fri published; pre-outreach A1–A4 + Stripe Path B + live surfaces spot-check Done. First DISPATCH batch sent same day.",
    },
    {
      title: "Control-First GRC founder newsletter — next edition outline",
      kind: "NEWSLETTER_DRAFT",
      status: "DONE",
      dueAt: "2026-08-01T17:00:00.000Z",
      sourceRef: "marketing/control-first-newsletter-aug",
      priorityHint: 40,
      synopsis:
        "Outline the next Control-First GRC founder newsletter companion to published Parts 1–3.",
      outcome:
        "PASS 2026-08-06 — Outline done. [2026-08-21] Active queue supersession: docs/briefing-queue/2026-08-28-draft-newsletter-control-first-evidence-theater.md (folds denied swivel-chair draft). Promote cards: marketing/control-first-newsletter-aug#review / #publish.",
      href: "/docs/marketing-strategy/control-first-newsletter-aug-2026-outline",
    },
    {
      title: "Control-First GRC newsletter — claim-hygiene review",
      kind: "NEWSLETTER_REVIEW",
      status: "PLANNED",
      dueAt: "2026-08-25T17:00:00.000Z",
      sourceRef: "marketing/control-first-newsletter-aug#review",
      priorityHint: 18,
      synopsis:
        "Voice-pass + Section V on Control-First evidence theater (Parts 1–3 + NIST + SEC 2022-168). Single canonical review card — auto queue-review duplicates are cancelled. Queue: 2026-08-28-draft-newsletter-control-first-evidence-theater.md.",
      href: "/dashboard/operations/publishing?desk=newsletters&draft=2026-08-28-draft-newsletter-control-first-evidence-theater.md",
      nextActions: [
        "Open Publishing Desk → Newsletters (this draft)",
        "Verify citations; no product CTA / no invented statutes",
        "Mark Done when ready for Aug 28 promote window",
      ],
    },
    {
      title: "Control-First GRC newsletter — promote / publish window",
      kind: "NEWSLETTER_SYNDICATE",
      status: "PLANNED",
      dueAt: "2026-08-28T17:00:00.000Z",
      sourceRef: "marketing/control-first-newsletter-aug#publish",
      priorityHint: 19,
      synopsis:
        "Human Promote on Publishing Desk → Newsletters for Control-First evidence theater (or founder-send only). Queue file: 2026-08-28-draft-newsletter-control-first-evidence-theater.md.",
      href: "/dashboard/operations/publishing?desk=newsletters&draft=2026-08-28-draft-newsletter-control-first-evidence-theater.md",
      nextActions: [
        "Open Publishing Desk → Newsletters (this draft)",
        "Claim-hygiene pass; Promote or Deny (human only)",
        "If Promote: syndicate / record publish URL in outcome",
      ],
    },
    {
      title: "LinkedIn Mon — Heatmap callback (color ≠ decision)",
      kind: "OPS_GENERAL",
      status: "PLANNED",
      dueAt: "2026-09-08T20:00:00.000Z",
      sourceRef: "marketing/linkedin-2026-09-08-heatmap-callback",
      href: "/dashboard/operations/publishing?desk=linkedin&li=2026-09-08-heatmap-callback",
      priorityHint: 22,
      synopsis:
        "Founder LinkedIn (Mon): callback to heatmap-vs-dollars / Heatmap Amnesty — reuses closed Aug auto drafts without a new GF Ironcast. Draft: linkedin-drafts-2026-09-08-heatmap-callback.md.",
      nextActions: [
        "Open Publishing Desk → LinkedIn (this calendar card)",
        "Voice-pass; Copy body → LinkedIn",
        "Paste first-comment CTA after publish",
        "Mark Done with LinkedIn URL",
      ],
    },
    {
      title: "LinkedIn Fri — Soft tags ≠ legal-entity wall",
      kind: "OPS_GENERAL",
      status: "PLANNED",
      dueAt: "2026-09-12T20:00:00.000Z",
      sourceRef: "marketing/linkedin-2026-09-12-enclaves-callback",
      href: "/dashboard/operations/publishing?desk=linkedin&li=2026-09-12-enclaves-callback",
      priorityHint: 23,
      synopsis:
        "Founder LinkedIn (Fri): cite published May 14 enclaves briefing — reuses denied tenancy autos as LinkedIn lesson only (no re-promote). Draft: linkedin-drafts-2026-09-12-enclaves-callback.md.",
      nextActions: [
        "Open Publishing Desk → LinkedIn (this calendar card)",
        "Voice-pass; confirm enclaves URL live",
        "Paste first-comment CTA after publish",
        "Mark Done with LinkedIn URL",
      ],
    },
    {
      title: "Companion story bank — schedule Friday lessons (post style freeze)",
      kind: "OPS_GENERAL",
      status: "PLANNED",
      dueAt: "2026-09-14T17:00:00.000Z",
      sourceRef: "marketing/companion-story-bank",
      priorityHint: 55,
      synopsis:
        "After video Phase 1 style freeze, schedule Friday companion story-bank lessons. [2026-08-15] Rescheduled to Mon Sep 14 (was Aug 15).",
    },
  ];
}

/** @deprecated Prefer preOutreachMarketing2026SeedSpecs (includes LinkedIn + gates). */
export function founderMarketing2026SeedSpecs(): OpsScheduleSeedSpec[] {
  return preOutreachMarketing2026SeedSpecs().filter((spec) =>
    spec.sourceRef.startsWith("marketing/linkedin") ||
    spec.sourceRef.startsWith("marketing/control-first-newsletter-aug") ||
    spec.sourceRef === "marketing/companion-story-bank",
  );
}

/** Intentional priorityHints for rollout gates that sit in the pre-outreach critical path. */
const ROLLOUT_PRIORITY_HINTS: Record<string, number> = {
  "rollout/dp-pre-outreach-gate": 3,
  "rollout/sms-dispatch-smoke": 4,
  "rollout/golden-path-regression": 9,
  "rollout/dp-icp-shortlist": 10,
  "rollout/first-salesteam-dispatch": 12,
  "rollout/partner-client-provisioning-1d": 15,
};

/**
 * Assign global P1…Pn ranks: open work first (hint then due date), then closed.
 * Lower stored priority number = higher badge (P1).
 */
export function assignCalendarPriorities(specs: OpsScheduleSeedSpec[]): OpsScheduleSeedSpec[] {
  const withHints = specs.map((spec) => ({
    ...spec,
    priorityHint:
      spec.priorityHint ??
      ROLLOUT_PRIORITY_HINTS[spec.sourceRef] ??
      (spec.status === "DONE" || spec.status === "CANCELLED" ? 9000 : 500),
  }));

  const open = withHints.filter(
    (s) => s.status !== "DONE" && s.status !== "CANCELLED",
  );
  const closed = withHints.filter(
    (s) => s.status === "DONE" || s.status === "CANCELLED",
  );

  const byUrgency = (a: OpsScheduleSeedSpec, b: OpsScheduleSeedSpec) => {
    const hintA = a.priorityHint ?? 500;
    const hintB = b.priorityHint ?? 500;
    if (hintA !== hintB) return hintA - hintB;
    return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
  };

  open.sort(byUrgency);
  closed.sort(byUrgency);

  return [
    ...open.map((spec, index) => ({ ...spec, priority: index + 1 })),
    ...closed.map((spec, index) => ({
      ...spec,
      priority: open.length + index + 1,
    })),
  ];
}

/** Engineering / board regulatory hooks beyond the editorial AI Act briefing. */
export function regulatoryEng2026SeedSpecs(): OpsScheduleSeedSpec[] {
  return [
    {
      title: "Eng — EU AI Act product/claim alignment check",
      kind: "OPS_GENERAL",
      status: "DONE",
      dueAt: "2026-07-31T17:00:00.000Z",
      sourceRef: "eng/eu-ai-act-claim-alignment",
      synopsis:
        "Internal product/claim alignment to EU AI Act obligations — pairs with the public GF briefing.",
      outcome:
        "PASS 2026-08-05 — Internal claim alignment recorded in docs/ops/eu-ai-act-claim-alignment-2026-08.md. No AI Act certification claims; transparency-threshold framing for 2 Aug 2026; public GF draft stays quarantined until Approve. Calendar catch-up 2026-08-06.",
    },
    {
      title: "Board packet — Aug AI Act + evidence posture",
      kind: "OPS_GENERAL",
      status: "DONE",
      dueAt: "2026-08-02T17:00:00.000Z",
      sourceRef: "eng/board-packet-ai-act-aug",
      synopsis:
        "Internal board packet on Aug AI Act applicability and evidence posture (not the public GF piece).",
      outcome:
        "PASS 2026-08-05 — Board packet substance captured in docs/ops/eu-ai-act-claim-alignment-2026-08.md (Aug threshold, inventory/role map/oversight questions). Not a public GF promote. Calendar catch-up 2026-08-06.",
    },
    {
      title: "Eng — NYDFS MFA readiness review",
      kind: "OPS_GENERAL",
      status: "PLANNED",
      dueAt: "2026-10-15T17:00:00.000Z",
      sourceRef: "eng/nydfs-mfa-2026-11-01",
      synopsis:
        "Engineering readiness review for NYDFS MFA obligation targeting 1 Nov 2026.",
    },
    {
      title: "Eng — CMMC Phase 2 / SPRS liability review",
      kind: "OPS_GENERAL",
      status: "PLANNED",
      dueAt: "2026-10-20T17:00:00.000Z",
      sourceRef: "eng/cmmc-phase2-2026-11-10",
      synopsis:
        "Engineering readiness for CMMC Phase 2 / SPRS liability hook targeting 10 Nov 2026.",
    },
  ];
}

/**
 * GF Desk notes — weekly publish on **Tue 18:00 UTC** (avoids LinkedIn Mon/Wed/Fri,
 * video Fri 16:00 UTC, and most monthly GF 17:00 windows).
 * Phase 1: Approve/publish staged backlog one per Tuesday.
 * Phase 2: after backlog clears — Mon research + Tue publish for new industry signals.
 */
export function deskNotesCadence2026SeedSpecs(): OpsScheduleSeedSpec[] {
  /** Quarantine backlog (signal-date order) from stage scripts — one Approve per Tuesday. */
  const backlog: Array<{ filename: string; label: string }> = [
    { filename: "2026-07-01-draft-desk-note-sharepoint-kev.md", label: "SharePoint KEV (1 Jul)" },
    {
      filename: "2026-07-02-draft-desk-note-ai-cyber-clearinghouse.md",
      label: "AI cyber clearinghouse (2 Jul)",
    },
    { filename: "2026-07-02-draft-desk-note-navient-item-105.md", label: "Navient Item 1.05 (2 Jul)" },
    {
      filename: "2026-07-06-draft-desk-note-illinois-ai-safety-act.md",
      label: "Illinois AI Safety Act (6 Jul)",
    },
    {
      filename: "2026-07-07-draft-desk-note-circia-september-target.md",
      label: "CIRCIA September target (7 Jul)",
    },
    { filename: "2026-07-07-draft-desk-note-ecb-ai-cyber-letter.md", label: "ECB AI cyber letter (7 Jul)" },
    {
      filename: "2026-07-16-draft-desk-note-fortisandbox-sharepoint-kev.md",
      label: "FortiSandbox + SharePoint KEV (16 Jul)",
    },
    {
      filename: "2026-07-21-draft-desk-note-wordpress-langflow-kev.md",
      label: "WordPress + Langflow KEV (21 Jul)",
    },
    {
      filename: "2026-07-22-draft-desk-note-checkpoint-sharepoint-kev.md",
      label: "Check Point + SharePoint KEV (22 Jul)",
    },
    {
      filename: "2026-07-27-draft-desk-note-arista-fortinet-kev.md",
      label: "Arista + Fortinet KEV (27 Jul)",
    },
    {
      filename: "2026-07-27-draft-desk-note-eu-ai-omnibus-force.md",
      label: "EU AI Omnibus force (27 Jul)",
    },
    { filename: "2026-07-29-draft-desk-note-cisco-fmc-kev.md", label: "Cisco FMC KEV (29 Jul)" },
    {
      filename: "2026-08-02-draft-desk-note-eu-ai-act-art50.md",
      label: "EU AI Act Art. 50 (2 Aug)",
    },
    {
      filename: "2026-08-03-draft-desk-note-ncentral-incomplete-fix.md",
      label: "N-central incomplete fix (3 Aug)",
    },
    {
      filename: "2026-08-05-draft-desk-note-teamcity-cicd-kev.md",
      label: "TeamCity CI/CD KEV (5 Aug)",
    },
    {
      filename: "2026-08-05-draft-desk-note-langflow-tomcat-kev.md",
      label: "Langflow + Tomcat KEV (5 Aug)",
    },
    { filename: "2026-08-07-draft-desk-note-bod-26-04-policy.md", label: "BOD 26-04 policy (7 Aug)" },
    { filename: "2026-08-07-draft-desk-note-loadmaster-kev.md", label: "LoadMaster KEV (7 Aug)" },
    {
      filename: "2026-08-10-draft-desk-note-fortios-loadmaster-due.md",
      label: "FortiOS / LoadMaster due (10 Aug)",
    },
    {
      filename: "2026-08-14-draft-desk-note-ai-act-art50-operating-week.md",
      label: "Art. 50 operating week (14 Aug)",
    },
    {
      filename: "2026-08-17-draft-desk-note-federal-contracting-cyber-rules.md",
      label: "Federal contracting cyber rules (17 Aug)",
    },
    {
      filename: "2026-08-24-draft-desk-note-circia-readiness-window.md",
      label: "CIRCIA readiness window (24 Aug)",
    },
    {
      filename: "2026-08-31-draft-desk-note-september-cyber-rulemaking.md",
      label: "September cyber rulemaking (31 Aug)",
    },
  ];

  /** First Tuesday publish window after 2026-08-11 (today) — clear of LinkedIn / video Fridays. */
  const firstPublishUtc = Date.UTC(2026, 7, 18, 18, 0, 0); // Tue 2026-08-18 18:00 UTC
  const weekMs = 7 * 24 * 60 * 60 * 1000;

  /** Desk notes already promoted — seed as DONE so calendar does not show stale PLANNED. */
  const publishedDeskNoteFilenames = new Set([
    "2026-08-24-draft-desk-note-circia-readiness-window.md",
  ]);

  const publishBacklog: OpsScheduleSeedSpec[] = backlog.map((item, index) => {
    const due = new Date(firstPublishUtc + index * weekMs);
    const published = publishedDeskNoteFilenames.has(item.filename);
    return {
      title: `Desk note — publish: ${item.label}`,
      kind: "BRIEFING_REVIEW" as const,
      status: (published ? "DONE" : "PLANNED") as "DONE" | "PLANNED",
      dueAt: due.toISOString(),
      sourceRef: item.filename,
      priorityHint: 40,
      synopsis:
        "Weekly GF desk note Approve window (Tue 18:00 UTC). Does not share Mon/Wed/Fri LinkedIn or Fri video publish slots. Signal date stays on the note — not Approve-day.",
      href: `/dashboard/operations/publishing?desk=desk-notes&draft=${encodeURIComponent(item.filename)}`,
      ...(published
        ? { outcome: `PASS 2026-08-24 — Promoted and posted (${item.label}).` }
        : {}),
    };
  });

  const lastBacklogDue = firstPublishUtc + (backlog.length - 1) * weekMs;
  /** First Monday research after backlog is scheduled clear (day after last Tue → next Mon). */
  const firstResearchUtc = lastBacklogDue + 6 * 24 * 60 * 60 * 1000; // Mon after last Tue
  const ongoingWeeks = 12;

  const ongoing: OpsScheduleSeedSpec[] = [];
  for (let i = 0; i < ongoingWeeks; i += 1) {
    const researchDue = new Date(firstResearchUtc + i * weekMs);
    const researchIso = new Date(
      Date.UTC(
        researchDue.getUTCFullYear(),
        researchDue.getUTCMonth(),
        researchDue.getUTCDate(),
        17,
        0,
        0,
      ),
    ).toISOString();
    const publishDay = new Date(researchDue.getTime() + 24 * 60 * 60 * 1000);
    const publishIso = new Date(
      Date.UTC(
        publishDay.getUTCFullYear(),
        publishDay.getUTCMonth(),
        publishDay.getUTCDate(),
        18,
        0,
        0,
      ),
    ).toISOString();
    const stamp = researchIso.slice(0, 10);
    ongoing.push({
      title: `Desk note — research industry signal (${stamp})`,
      kind: "OPS_GENERAL",
      status: "PLANNED",
      dueAt: researchIso,
      sourceRef: `gf/desk-notes#research-${stamp}`,
      priorityHint: 45,
      synopsis:
        "Backlog cleared — research one new industry signal for next day’s desk note. Primary sources only; no overlap with monthly briefing/newsletter lead topics.",
      href: "/dashboard/operations/publishing?desk=desk-notes",
    });
    ongoing.push({
      title: `Desk note — publish weekly signal (${publishIso.slice(0, 10)})`,
      kind: "OPS_GENERAL",
      status: "PLANNED",
      dueAt: publishIso,
      sourceRef: `gf/desk-notes#publish-${publishIso.slice(0, 10)}`,
      priorityHint: 40,
      synopsis:
        "Approve/promote the desk note staged from Monday research. Tue 18:00 UTC only — do not move onto LinkedIn or video Fridays.",
      href: "/dashboard/operations/publishing?desk=desk-notes",
    });
  }

  return [...publishBacklog, ...ongoing];
}

/** All project packs for Ops Calendar seed (idempotent by sourceRef+kind). */
export function linkedinTriageFollowups2026SeedSpecs(): OpsScheduleSeedSpec[] {
  return [
    {
      title: "Follow-up — CISA BOD 26-02 recording (EoS edge devices)",
      kind: "OPS_GENERAL",
      status: "DONE",
      dueAt: "2026-08-19T17:00:00.000Z",
      sourceRef: "gf/followup-2026-08-14-bod-26-02",
      priorityHint: 4,
      href: "/dashboard/operations/publishing?desk=desk-notes",
      synopsis:
        "LinkedIn: CISA hosted Understanding BOD 26-02 — Securing End-of-Support Edge Devices (recording). Adjacent to KEV / BOD desk-note lane. Watch or skim → decide whether a quarantined desk note is warranted (do not invent claims).",
      outcome:
        "CLOSED 2026-08-19 — Desk note warranted and promoted: 2026-08-19-desk-note-bod-26-02-eos-edge (CISA BOD 26-02 EoS edge devices).",
    },
    {
      title: "Follow-up — AI change-control thread (Tia Hopkins / Greg Crowley)",
      kind: "OPS_GENERAL",
      status: "DONE",
      dueAt: "2026-08-20T17:00:00.000Z",
      sourceRef: "marketing/linkedin-followup-2026-08-14-ai-change-control",
      priorityHint: 5,
      href: "/dashboard/operations/publishing?desk=linkedin",
      synopsis:
        "Optional skim only. Same AI-governance neighborhood as AI-evidence post. Engage only if you can add a control-first distinction without duplicating your Aug post. Otherwise Done = skimmed / no engage.",
      outcome:
        "DONE 2026-08-19 — Skimmed Tia Hopkins → Greg Crowley AI change-control thread. No engage: same neighborhood as Aug AI-evidence post.",
    },
    {
      title: "Follow-up — M&A security diligence angle (Gene Magerr)",
      kind: "OPS_GENERAL",
      status: "DONE",
      dueAt: "2026-08-21T17:00:00.000Z",
      sourceRef: "marketing/linkedin-followup-2026-08-14-ma-diligence",
      priorityHint: 5,
      href: "/docs/marketing-strategy/linkedin-founder-cadence",
      synopsis:
        "Soft overlap with multi-entity / soft-tenancy / enclaves. Optional: park a future founder post on security debt in deal valuation — not a copy of Magerr. No engage required.",
      outcome:
        "DONE 2026-08-21 — Skimmed Magerr M&A diligence post. Angle parked for Sep 15 founder post (marketing/linkedin-2026-09-15-ma-security-debt); no engage.",
    },
  ];
}

export function allProjects2026SeedSpecs(): OpsScheduleSeedSpec[] {
  return assignCalendarPriorities([
    ...preOutreachMarketing2026SeedSpecs(),
    ...founderLinkedInNetworkHygiene2026SeedSpecs(),
    ...linkedinTriageFollowups2026SeedSpecs(),
    ...summer2026SeedSpecs(),
    ...videoCampaign2026SeedSpecs(),
    ...ironframeRollout2026SeedSpecs(),
    ...researchPaper2026SeedSpecs(),
    ...queueBacklog2026SeedSpecs(),
    ...deskNotesCadence2026SeedSpecs(),
    ...regulatoryEng2026SeedSpecs(),
  ]);
}
