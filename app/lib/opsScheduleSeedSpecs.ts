import type { OpsActivityKind, OpsActivityStatus } from "@prisma/client";

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

/** Resolve the link that will be stored/shown for a seed row. */
export function hrefForSeedSpec(spec: Pick<OpsScheduleSeedSpec, "sourceRef" | "kind" | "href">): string {
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
  if (ref.startsWith("marketing/cold-outreach-gate")) {
    return [
      "Confirm LinkedIn Mon/Wed/Fri week-1 posts published (or scheduled)",
      "Confirm pre-outreach A1–A4 + Stripe Path B + live surfaces spot-check are Done",
      "Only then Start first SalesTeam DISPATCH batch",
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
    return [
      "Outline next Control-First GRC founder newsletter edition",
      "Stage draft to queue if publishing via Ops Hub",
      "Mark Done when outline/draft is ready for review",
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
    return "Quarantined Medshield draft — confirm demo-tenant boundary before any public path.";
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
        "Ops review completed 2026-06-20. Citations checked; draft cleared June GF research slate path (staged briefing on CPS 230 MSP/fourth-party/exit risk).",
    },
    {
      title: "AUSTRAC Tranche 2 newsletter — July reframe & promote",
      kind: "NEWSLETTER_REVIEW",
      status: "IN_PROGRESS",
      dueAt: "2026-07-25T17:00:00.000Z",
      sourceRef: "2026-06-16-draft-newsletter-austrac-tranche-2.md",
      synopsis:
        "AU industry newsletter on Tranche 2 AML/CTF — June ops language cleared; still quarantined. Reframe for post-1 July enrolment window, then desk + Approve.",
      nextActions: [
        "Reframe draft from June readiness to post-1 July / enrolment-by-29-July clock",
        "Re-verify AUSTRAC citations and designated-services scoping language",
        "Run GF publication desk pass (regulatory + product boundary)",
        "Ops Hub Approve (or Deny); mark Done with outcome only after promote/deny",
      ],
    },
    {
      title: "DORA supervision briefing — Ops review & promote",
      kind: "BRIEFING_REVIEW",
      status: "IN_REVIEW",
      dueAt: "2026-07-22T17:00:00.000Z",
      sourceRef: "2026-07-16-draft-research-dora-supervision.md",
      synopsis:
        "EU research briefing on DORA moving from implementation to competent-authority supervision — review citations, then promote.",
      nextActions: [
        "Open DORA supervision quarantine draft",
        "Verify citations — supervision readiness, not a fictional EU-wide year-two exam",
        "Promote or Deny; mark Done with outcome",
      ],
    },
    {
      title: "CSRD / Omnibus ESRS newsletter — Ops review & promote",
      kind: "NEWSLETTER_REVIEW",
      status: "IN_REVIEW",
      dueAt: "2026-07-24T17:00:00.000Z",
      sourceRef: "2026-07-16-draft-newsletter-csrd-omnibus-esrs.md",
      synopsis:
        "EU industry newsletter on CSRD after Omnibus I and revised ESRS — verify OJ/application dates before promote.",
      nextActions: [
        "Open CSRD / Omnibus ESRS newsletter draft",
        "Verify OJ vs adopted language and application dates",
        "Promote or Deny; mark Done with outcome",
      ],
    },
    {
      title: "EU AI Act August 2 briefing — final fact-check",
      kind: "BRIEFING_REVIEW",
      status: "PLANNED",
      dueAt: "2026-07-30T17:00:00.000Z",
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
      dueAt: "2026-08-02T17:00:00.000Z",
      sourceRef: "2026-08-02-draft-research-eu-ai-act-august.md#publish",
      synopsis:
        "Publish the AI Act briefing on the 2 Aug 2026 applicability threshold after final fact-check passes.",
      nextActions: [
        "Confirm final fact-check activity is Done",
        "Publish on/near 2 Aug 2026 threshold",
        "Mark Done with publish slug/URL",
      ],
    },
    {
      title: "SEC Item 1.05 filings newsletter — Ops review",
      kind: "NEWSLETTER_REVIEW",
      status: "PLANNED",
      dueAt: "2026-08-12T17:00:00.000Z",
      sourceRef: "2026-08-16-draft-newsletter-sec-item-105-filings.md",
      synopsis:
        "US newsletter analyzing Item 1.05 cyber disclosure filing patterns and materiality — re-verify EDGAR examples before promote.",
      nextActions: [
        "Re-verify EDGAR Item 1.05 examples",
        "Confirm materiality framing (patterns, not rule restatement)",
        "Promote or Deny; mark Done with outcome",
      ],
    },
    {
      title: "SEC cyber disclosure newsletter — syndicate",
      kind: "NEWSLETTER_SYNDICATE",
      status: "PLANNED",
      dueAt: "2026-08-16T17:00:00.000Z",
      sourceRef: "2026-08-16-draft-newsletter-sec-item-105-filings.md#syndicate",
      synopsis:
        "After promote, syndicate the SEC cyber disclosure newsletter to distribution channels.",
      nextActions: [
        "Confirm SEC newsletter promote is Done",
        "Syndicate to RSS / Ironcast / channels",
        "Mark Done with syndicate paths",
      ],
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
      dueAt: "2026-07-25T17:00:00.000Z",
      sourceRef: "video-series/when-risk-enters-the-room#phase-0",
      synopsis:
        "Lock character refs, boardroom stills, title/end cards, and V1–V2 shot lists before episode production spend.",
    },
    {
      title: "Video V1 — The Risk Register (build)",
      kind: "OPS_GENERAL",
      status: "PLANNED",
      dueAt: "2026-08-01T17:00:00.000Z",
      sourceRef: "video-series/when-risk-enters-the-room#v1-build",
      synopsis:
        "Produce Episode 1 (The Number / risk register) clips for 6 Aug publish — Phase 1 budget ~$200.",
    },
    {
      title: "Video V1 — Publish The Number",
      kind: "OPS_GENERAL",
      status: "PLANNED",
      dueAt: "2026-08-06T15:00:00.000Z",
      sourceRef: "video-series/when-risk-enters-the-room#v1-publish",
      synopsis:
        "Ship Episode 1 to LinkedIn + /marketing with CTA to a 10–15 min workflow review.",
    },
    {
      title: "Video V2 — The Audit Request (build)",
      kind: "OPS_GENERAL",
      status: "PLANNED",
      dueAt: "2026-08-08T17:00:00.000Z",
      sourceRef: "video-series/when-risk-enters-the-room#v2-build",
      synopsis:
        "Produce Episode 2 (The Evidence / audit request) and freeze the style pack after edit.",
    },
    {
      title: "Video V2 — Publish The Evidence",
      kind: "OPS_GENERAL",
      status: "PLANNED",
      dueAt: "2026-08-13T15:00:00.000Z",
      sourceRef: "video-series/when-risk-enters-the-room#v2-publish",
      synopsis:
        "Ship Episode 2 pointing to /product-demo and audit-ready evidence solutions.",
    },
    {
      title: "Video Phase 2 — V3/V4/V5 production window",
      kind: "OPS_GENERAL",
      status: "PLANNED",
      dueAt: "2026-08-18T17:00:00.000Z",
      sourceRef: "video-series/when-risk-enters-the-room#phase-2",
      synopsis:
        "Start Episodes 3–5 (Boundary, Draft, Intake) production window for late-Aug / Sep publishes.",
    },
    {
      title: "Video V3 — Publish The Boundary",
      kind: "OPS_GENERAL",
      status: "PLANNED",
      dueAt: "2026-08-27T15:00:00.000Z",
      sourceRef: "video-series/when-risk-enters-the-room#v3-publish",
      synopsis:
        "Ship Episode 3 on multi-entity / boundary control with workflow-review CTA.",
    },
    {
      title: "Video V4 — Publish The Draft",
      kind: "OPS_GENERAL",
      status: "PLANNED",
      dueAt: "2026-09-03T15:00:00.000Z",
      sourceRef: "video-series/when-risk-enters-the-room#v4-publish",
      synopsis:
        "Ship Episode 4 on governed AI drafts — AI never self-approves.",
    },
    {
      title: "Video V5 — Publish The Intake",
      kind: "OPS_GENERAL",
      status: "PLANNED",
      dueAt: "2026-09-10T15:00:00.000Z",
      sourceRef: "video-series/when-risk-enters-the-room#v5-publish",
      synopsis:
        "Ship Episode 5 on Irongate sanitize-before-persist intake narrative.",
    },
    {
      title: "Video V6 — Complete Story (build)",
      kind: "OPS_GENERAL",
      status: "PLANNED",
      dueAt: "2026-09-26T17:00:00.000Z",
      sourceRef: "video-series/when-risk-enters-the-room#v6-build",
      synopsis:
        "Finish the 2–3 min complete Ironframe story film for 1 Oct publish.",
    },
    {
      title: "Video V6 — Publish Complete Ironframe Story",
      kind: "OPS_GENERAL",
      status: "PLANNED",
      dueAt: "2026-10-01T15:00:00.000Z",
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
      status: "IN_PROGRESS",
      dueAt: "2026-07-22T17:00:00.000Z",
      sourceRef: "rollout/dp-pre-outreach-gate",
      synopsis:
        "Clear A1–A4 on the design-partner operator launch checklist before any outbound batch.",
    },
    {
      title: "Rollout — SMS DISPATCH / Twilio smoke",
      kind: "OPS_GENERAL",
      status: "PLANNED",
      dueAt: "2026-07-22T17:00:00.000Z",
      sourceRef: "rollout/sms-dispatch-smoke",
      synopsis:
        "Prove SalesTeam SMS DISPATCH via Twilio end-to-end before first live outreach batch.",
    },
    {
      title: "Rollout — ICP shortlist + warm intros batch",
      kind: "OPS_GENERAL",
      status: "PLANNED",
      dueAt: "2026-07-25T17:00:00.000Z",
      sourceRef: "rollout/dp-icp-shortlist",
      synopsis:
        "Finalize Path B ICP shortlist and warm-intro targets for design-partner recruitment.",
    },
    {
      title: "Rollout — Golden Path regression smoke (Stops 1–5)",
      kind: "OPS_GENERAL",
      status: "PLANNED",
      dueAt: "2026-07-24T17:00:00.000Z",
      sourceRef: "rollout/golden-path-regression",
      synopsis:
        "Re-run Golden Path Stops 1–5 so production demo path is green before DP outreach.",
    },
    {
      title: "Rollout — Partner client provisioning (1D) walkthrough",
      kind: "OPS_GENERAL",
      status: "PLANNED",
      dueAt: "2026-07-28T17:00:00.000Z",
      sourceRef: "rollout/partner-client-provisioning-1d",
      synopsis:
        "Walk the 1D partner→client provisioning path so first design partners can be onboarded cleanly.",
    },
    {
      title: "Rollout — First SalesTeam DISPATCH batch",
      kind: "OPS_GENERAL",
      status: "PLANNED",
      dueAt: "2026-07-29T17:00:00.000Z",
      sourceRef: "rollout/first-salesteam-dispatch",
      synopsis:
        "Board-first HITL outbound batch to the Path B design-partner cohort.",
    },
    {
      title: "Rollout — 2A Stripe subscription lifecycle PASS",
      kind: "OPS_GENERAL",
      status: "PLANNED",
      dueAt: "2026-08-08T17:00:00.000Z",
      sourceRef: "rollout/fl2-2a-stripe-lifecycle",
      synopsis:
        "FL2 commercial gate: prove Stripe subscription create/update/cancel lifecycle PASS.",
    },
    {
      title: "Rollout — 2B entitlement matrix PASS",
      kind: "OPS_GENERAL",
      status: "PLANNED",
      dueAt: "2026-08-15T17:00:00.000Z",
      sourceRef: "rollout/fl2-2b-entitlement-matrix",
      synopsis:
        "FL2 commercial gate: entitlement matrix matches SKU/plan access for paying partners.",
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
      dueAt: "2026-08-20T17:00:00.000Z",
      sourceRef: "rollout/phase-b-first-live-partner",
      synopsis:
        "Land first paying Path B design partner ACTIVE (market-entrance Phase B).",
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
      status: "PLANNED",
      dueAt: "2026-07-28T17:00:00.000Z",
      sourceRef: "research/GF-2026-001#editorial-review",
      synopsis:
        "Editorial and regulatory-scope review of the Evolution of GRC research paper before product-boundary check.",
    },
    {
      title: "GF-2026-001 — Product-boundary review",
      kind: "RESEARCH_PAPER",
      status: "PLANNED",
      dueAt: "2026-08-01T17:00:00.000Z",
      sourceRef: "research/GF-2026-001#product-boundary",
      synopsis:
        "Ensure the public paper stays institutional GRC analysis — no Ironframe product CTA leakage.",
    },
    {
      title: "GF-2026-001 — Operator Approve / publish",
      kind: "RESEARCH_PAPER",
      status: "PLANNED",
      dueAt: "2026-08-15T17:00:00.000Z",
      sourceRef: "research/GF-2026-001#publish",
      synopsis:
        "Human-only Approve/publish after editorial and product-boundary reviews both pass.",
    },
  ];
}

/** Staged queue drafts outside the named summer slate. */
export function queueBacklog2026SeedSpecs(): OpsScheduleSeedSpec[] {
  return [
    {
      title: "Queue — Review GRC evolution research draft",
      kind: "BRIEFING_REVIEW",
      status: "IN_REVIEW",
      dueAt: "2026-07-23T17:00:00.000Z",
      sourceRef: "2026-07-15-draft-research-grc-evolution.md",
      synopsis:
        "Quarantined research on how GRC evolved — Ops promote or deny after citation check.",
    },
    {
      title: "Queue — Review GRC current-pain research draft",
      kind: "BRIEFING_REVIEW",
      status: "IN_REVIEW",
      dueAt: "2026-07-23T17:00:00.000Z",
      sourceRef: "2026-07-15-draft-research-grc-current-pain.md",
      synopsis:
        "Quarantined research on current GRC operator pain — Ops promote or deny after citation check.",
    },
    {
      title: "Queue — Review stakeholder benefit-map draft",
      kind: "BRIEFING_REVIEW",
      status: "IN_REVIEW",
      dueAt: "2026-07-24T17:00:00.000Z",
      sourceRef: "2026-07-15-draft-research-stakeholder-benefit-map.md",
      synopsis:
        "Stakeholder benefit-map draft is product-boundary heavy — review carefully before any promote.",
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
  ];
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
      status: "PLANNED",
      dueAt: "2026-07-20T17:00:00.000Z",
      sourceRef: "marketing/live-surfaces-credibility-spotcheck",
      priorityHint: 1,
      synopsis:
        "Before outreach: verify /marketing, /product-demo, Trust Center, contact, and published GF briefings look coherent.",
    },
    {
      title: "Marketing — Confirm Path B Stripe activation checkout",
      kind: "OPS_GENERAL",
      status: "PLANNED",
      dueAt: "2026-07-20T18:00:00.000Z",
      sourceRef: "marketing/path-b-stripe-activation-confirm",
      priorityHint: 2,
      synopsis:
        "Pre-outreach checklist: tenant-scoped Path B activation is live; never send PENDING partners to generic /pricing.",
    },
    {
      title: "LinkedIn Mon — GRC problem post (heatmap vs dollars)",
      kind: "OPS_GENERAL",
      status: "PLANNED",
      dueAt: "2026-07-21T15:00:00.000Z",
      sourceRef: "marketing/linkedin-2026-07-21",
      priorityHint: 5,
      synopsis:
        "Founder LinkedIn: Monday problem post contrasting heatmap theater vs dollar-risk clarity.",
    },
    {
      title: "LinkedIn Wed — point to /product-demo (pre-video)",
      kind: "OPS_GENERAL",
      status: "PLANNED",
      dueAt: "2026-07-23T15:00:00.000Z",
      sourceRef: "marketing/linkedin-2026-07-23",
      priorityHint: 6,
      synopsis:
        "Founder LinkedIn: Wednesday post to /product-demo while video Wed demos start 6 Aug.",
    },
    {
      title: "LinkedIn Fri — GF control lesson",
      kind: "OPS_GENERAL",
      status: "PLANNED",
      dueAt: "2026-07-25T15:00:00.000Z",
      sourceRef: "marketing/linkedin-2026-07-25",
      priorityHint: 7,
      synopsis:
        "Founder LinkedIn: Friday Governance Frame control lesson for the week of 21 Jul.",
    },
    {
      title: "Marketing — Warm network / advisor asks (before cold)",
      kind: "OPS_GENERAL",
      status: "PLANNED",
      dueAt: "2026-07-26T17:00:00.000Z",
      sourceRef: "marketing/warm-network-advisor-asks",
      priorityHint: 8,
      synopsis:
        "Fastest first doors: ask warm network who has board-risk / evidence friction — before cold co-builder batch.",
    },
    {
      title: "Marketing — Cold outreach gate (after free marketing)",
      kind: "OPS_GENERAL",
      status: "PLANNED",
      dueAt: "2026-07-28T17:00:00.000Z",
      sourceRef: "marketing/cold-outreach-gate",
      priorityHint: 11,
      synopsis:
        "Do not start cold Path B DISPATCH until LinkedIn week-1 + pre-outreach checklist + live surfaces pass.",
    },
    {
      title: "Control-First GRC founder newsletter — next edition outline",
      kind: "NEWSLETTER_DRAFT",
      status: "PLANNED",
      dueAt: "2026-08-01T17:00:00.000Z",
      sourceRef: "marketing/control-first-newsletter-aug",
      priorityHint: 40,
      synopsis:
        "Outline the next Control-First GRC founder newsletter companion to published Parts 1–3.",
    },
    {
      title: "Companion story bank — schedule Friday lessons (post style freeze)",
      kind: "OPS_GENERAL",
      status: "PLANNED",
      dueAt: "2026-08-15T17:00:00.000Z",
      sourceRef: "marketing/companion-story-bank",
      priorityHint: 55,
      synopsis:
        "After video Phase 1 style freeze (~14 Aug), schedule Friday companion story-bank lessons.",
    },
  ];
}

/** @deprecated Prefer preOutreachMarketing2026SeedSpecs (includes LinkedIn + gates). */
export function founderMarketing2026SeedSpecs(): OpsScheduleSeedSpec[] {
  return preOutreachMarketing2026SeedSpecs().filter((spec) =>
    spec.sourceRef.startsWith("marketing/linkedin") ||
    spec.sourceRef === "marketing/control-first-newsletter-aug" ||
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
      status: "PLANNED",
      dueAt: "2026-07-31T17:00:00.000Z",
      sourceRef: "eng/eu-ai-act-claim-alignment",
      synopsis:
        "Internal product/claim alignment to EU AI Act obligations — pairs with the public GF briefing.",
    },
    {
      title: "Board packet — Aug AI Act + evidence posture",
      kind: "OPS_GENERAL",
      status: "PLANNED",
      dueAt: "2026-08-02T17:00:00.000Z",
      sourceRef: "eng/board-packet-ai-act-aug",
      synopsis:
        "Internal board packet on Aug AI Act applicability and evidence posture (not the public GF piece).",
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

/** All project packs for Ops Calendar seed (idempotent by sourceRef+kind). */
export function allProjects2026SeedSpecs(): OpsScheduleSeedSpec[] {
  return assignCalendarPriorities([
    ...preOutreachMarketing2026SeedSpecs(),
    ...summer2026SeedSpecs(),
    ...videoCampaign2026SeedSpecs(),
    ...ironframeRollout2026SeedSpecs(),
    ...researchPaper2026SeedSpecs(),
    ...queueBacklog2026SeedSpecs(),
    ...regulatoryEng2026SeedSpecs(),
  ]);
}
