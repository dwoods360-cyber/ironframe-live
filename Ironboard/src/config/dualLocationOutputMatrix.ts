/**
 * IronBoard mirror of lib/documentationCorpusPlanes.ts — Dual-Location Output Matrix.
 * Keep in sync with the authoritative registry in the Ironframe app package.
 */

export const BOARD_DUAL_LOCATION_OUTPUT_MATRIX = `
[DUAL-LOCATION OUTPUT MATRIX — AUTHORITATIVE]
1. Newsletters & Briefings / Governance Frame Research Encyclopedia (EXTERNAL_GTM_INTELLIGENCE)
   Content: Real-world market analysis, regulatory change narratives, institutional briefing logs, and published GF research catalog.
   Target: primary: https://research.ironframegrc.com/briefings/[slug] · staging: docs/briefing-queue/ · database: PublishedBriefing · repository: published-briefings/, governance-frame/ · external: research.ironframegrc.com, Ironcast
   Trigger: GF publication desk (Ops Hub briefings/desk-run), Ops Hub briefings/request or newsletters/request, autonomous weekday GTM cron (/api/cron/gtm-briefing-queue), or narrate → briefing-queue draft → human Promote (approve) or Deny → PublishedBriefing → Ironcast newsletter/RSS syndicate
   Authors (WRITE-to-queue): gf-researcher, gf-editor, gf-verifier, gf-regulatory-reviewer, gf-product-boundary, gf-operator (desk), board-bot, board-cfo, board-compliance, GTM flywheel agents, Irontally narrate cron, autonomous GTM briefing-queue cron, Ops Hub briefings/request, Ops Hub newsletters/request
   READ access: all board personas + perimeter workers may cite the published encyclopedia (federated + product spine)
   Operator submit:
  - /dashboard/operations?tab=briefings · POST /api/admin/operations-hub/briefings/desk-run (GF desk)
  - /dashboard/operations?tab=briefings · POST /api/admin/operations-hub/briefings/request
  - /dashboard/operations?tab=newsletters · POST /api/admin/operations-hub/newsletters/request
  - Approve: briefings/promote · Deny: briefings/deny (human Publisher only — desk agents never promote)
   Rules:
  - Dynamic, narrative-driven, and completely decoupled from internal system code.
  - Communicates outward to prospects and design partners to showcase active intelligence posture.
  - Drafts quarantined in briefing-queue/ — never compiled to /docs, agent corpora, or public routes until promoted.
  - Published ledger lives in PostgreSQL and renders at research.ironframegrc.com/briefings/[slug].
  - Agents MAY READ published GF research for citation; NEVER ingest briefing-queue drafts.
  - Mandatory Section V citations before human promotion.
  - GF desk writes optional docs/briefing-queue/.desk-reviews/*.desk.json advisory checklists only.
  - board-trainer and board-writer must never write to this plane.

2. App Docs (INTERNAL_PRODUCT_GRC_CORPUS)
   Content: Highly structured dual-level framework manuals: Level 1 end-user quickstarts and Level 2 advanced technical specifications.
   Target: primary: /docs · staging: GET /api/board/shared-context → documentationBrief · repository: user-manuals/, technical/, training/
   Trigger: POST /api/documentation/execute
   Authors: board-trainer, board-writer
   Rules:
  - Purely technical and strict — grounded in source anchors, TAS, and live telemetry baselines.
  - Updates through asynchronous POST /api/documentation/execute on IronBoard (:8082).
  - Architecture manuals, API definitions, and training paths must reflect real database baselines (BigInt cents).
  - Content firewall validates every write before landing in docs/.
  - Never publish app manuals to /governance-frame or external GTM channels.
`.trim();

export const APP_DOCS_EXECUTE_ENDPOINT = "POST /api/documentation/execute" as const;
export const GOVERNANCE_FRAME_ROUTE = "/governance-frame" as const;
export const APP_DOCS_ROUTE = "/docs" as const;
