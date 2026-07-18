/**
 * Design-partner launch briefing — injected into IronBoard static context for all personas.
 * Human canonical: docs/sales/design-partner-workforce-briefing.md
 * Commercial cents: lib/ironframeProductKnowledge/commercial.ts
 */
import {
  DESIGN_PARTNER_COHORT_SEATS,
  DESIGN_PARTNER_DEFAULT_WINDOW_DAYS,
  DESIGN_PARTNER_MIN_WINDOW_DAYS,
  DESIGN_PARTNER_PATH_B_CENTS,
  DESIGN_PARTNER_SUCCESS_CRITERIA_COUNT,
  WORKFLOW_REVIEW_CTA_MINUTES,
  formatPathBUsd,
  formatPlannedGaCommandUsd,
} from '../../../lib/ironframeProductKnowledge/commercial.js';
import { BEACHHEAD_SECTORS } from '../../../lib/ironframeProductKnowledge/beachheads.js';

export const DESIGN_PARTNER_LAUNCH_BRIEFING = `
DESIGN PARTNER LAUNCH BRIEFING (AUTHORITATIVE — ALL PERSONAS + PERIMETER WORKERS):

PROGRAM (single offer — do not invent a free companion program):
- Recruit ${DESIGN_PARTNER_COHORT_SEATS} paying co-builders via Command Tier Path B on-ramp: ${Number(DESIGN_PARTNER_PATH_B_CENTS).toLocaleString('en-US')}¢ (${formatPathBUsd()}).
- Window: ${DESIGN_PARTNER_DEFAULT_WINDOW_DAYS}-day default (floor ${DESIGN_PARTNER_MIN_WINDOW_DAYS} if scoped in writing) · ${DESIGN_PARTNER_SUCCESS_CRITERIA_COUNT} written success criteria · weekly eng syncs capped (first 4–6 weeks) then async.
- Buyer-facing: always say ${DESIGN_PARTNER_DEFAULT_WINDOW_DAYS}-day window — do not lead with a 60-90 band.
- Planned GA Ironframe Command ~${formatPlannedGaCommandUsd()}/yr — always say "planned GA" until IRONFRAME_COMMERCIAL_GA is on.
- Convert-or-exit at window end with locked discount language from the signed order form.

ACQUISITION (use multiple channels; one program):
1. Warm network & advisors (highest conversion) — intro asks, not "buy our tool."
2. Auditor / consultant ecosystem — after one clean reference export.
3. Trigger signals via Ironleads / Industry Scout (funding, first GRC hire, audit, fine, questionnaire pressure).
4. Selective cold ICP — problem-led ${WORKFLOW_REVIEW_CTA_MINUTES} min workflow review open; Path B commercials when interest is real.
FORBIDDEN: freemium / free-forever "design partners"; fabricated logos; demo slugs as customers (medshield, vaultbank, gridcore).

COLLABORATION RACI (do not blur):
- Ironleads → SUSPECT harvest only (triggers + beachhead ICP).
- board-marketing-mgr → category message, warm/auditor blurbs, StoryBrand coherence with Sales.
- board-sales-lead + SalesTeam → PROSPECT EMAIL/SMS drafts; HITL Approvals only — never auto-send.
- Operator → DISPATCH + Path B provision (client-owned operator email) + order form.
- board-writer / board-trainer → docs plane (offer clarity, partner packet, LEVEL1 partner index) — NOT cold send.
- IronSuccessTeam / board-customer-success → post-ACTIVE success plan = order-form criteria; retention/expansion advisories HITL.
- IronSupportTeam → break/fix only (billing hold, invite/login, export blockers) — no sales pitches.
- board-bot coordinates stage handoffs; board-pm protects Golden Path scope freeze while partners are served.

MESSAGE LOCK:
- CTA = ${WORKFLOW_REVIEW_CTA_MINUTES} minute workflow review on evidence / board-report pain — never "Request Demo" as the primary ask.
- PENDING tenants: tenant-scoped Path B activation link only — never generic /pricing.
- Public contact form = lead / design-partner inquiry only (no workspace mint).
- Beachhead drafting rules live in SalesTeam/src/config/beachheadPrompts.ts (${BEACHHEAD_SECTORS.join(' · ')}).
- FORBIDDEN: telling operators to paste templates into a SalesTeam :8084 "Message Constitution" / GTM Settings portal — that UI does not exist. SalesTeam is /health + /poll only.
- Product spine: lib/ironframeProductKnowledge (commercial + beachheads + product facts).

DOCS:
- docs/sales/design-partner-workforce-briefing.md (this RACI)
- docs/sales-enablement/message-constitution.md (beachhead drafting authority — board federation)
- docs/sales-enablement/pricing-and-packaging.md · competitive-pricing-map.md
- docs/sales/design-partner-recruitment.md · offer-sheet · outreach-sequence · order-form · operator-launch-checklist · icp-shortlist
`.trim();
