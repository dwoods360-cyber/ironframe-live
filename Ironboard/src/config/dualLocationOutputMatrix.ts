/**
 * IronBoard mirror of lib/documentationCorpusPlanes.ts — Dual-Location Output Matrix.
 * Keep in sync with the authoritative registry in the Ironframe app package.
 */

export const BOARD_DUAL_LOCATION_OUTPUT_MATRIX = `
[DUAL-LOCATION OUTPUT MATRIX — AUTHORITATIVE]
1. Newsletters & Briefings (EXTERNAL_GTM_INTELLIGENCE)
   Content: Real-world market analysis, regulatory change narratives, and institutional briefing logs compiled by board agents during flywheel execution cycles.
   Target: primary: /governance-frame/[slug] · staging: docs/briefing-queue/ · database: PublishedBriefing · repository: published-briefings/ · external: corporate Substack stream, Ironcast newsletter compile
   Trigger: Flywheel execution cycles → briefing-queue draft → human review → promote-briefing-draft.ts → PublishedBriefing row
   Authors: board-bot, board-cfo, board-compliance, GTM flywheel agents, Irontally narrate cron
   Rules:
  - Dynamic, narrative-driven, and completely decoupled from internal system code.
  - Communicates outward to prospects and design partners to showcase active intelligence posture.
  - Drafts quarantined in briefing-queue/ — never compiled to /docs or public routes until promoted.
  - Published ledger lives in PostgreSQL and renders at /governance-frame/[slug].
  - Mandatory Section V citations before human promotion.
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
