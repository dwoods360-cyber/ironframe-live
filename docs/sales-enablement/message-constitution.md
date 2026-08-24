---
Document Type: Sales Enablement Documentation
Status: ACTIVE
Security Classification: INTERNAL ONLY (Tenant Boundaries Enforced)
Last Updated: 2026-08-21
---

# Message Constitution — Beachhead Drafting Authority

> Board docs-matrix ingest path (`sales-enablement`).  
> Human RACI companion: [`docs/sales/design-partner-workforce-briefing.md`](../sales/design-partner-workforce-briefing.md).  
> Code truth: `lib/ironframeProductKnowledge/` · sync: `npm run knowledge:check` / `npm run knowledge:sync`.

## Purpose

Define where outbound message guardrails live, how beachhead sectors map to drafts, and what IronBoard must **never** invent when advising operators.

## Scope

- Internal operators and IronBoard personas only.
- Applies to SalesTeam PROSPECT EMAIL/SMS drafts (HITL Approvals) — never auto-send.
- Does **not** create a SalesTeam browser admin UI.

## Authority lock (read this first)

| Claim | Truth |
|-------|--------|
| IronBoard can write templates into SalesTeam DB / system files | **False** — IronBoard is read-only advisory (`:8082`). Paste in chat is not a filesystem write. |
| Operators paste templates into a SalesTeam “Message Constitution” portal on `:8084` | **False** — that UI does not exist. |
| SalesTeam has **GTM Settings** / **Campaign Engine** / **Save & Lock** tabs | **False** — fabricated labels. |
| Beachhead drafting rules live in code | **True** — edit TypeScript config, then restart/redeploy SalesTeam. |
| Ops Hub → SalesTeam | **True for health / poll** — not for editing constitutions. |

### SalesTeam HTTP surface (authoritative)

- Port: **8084** (`SALESTEAM_PORT` / `OPERATIONS_SALESTEAM_URL`)
- Endpoints: `GET /health`, `POST /poll`
- No React/admin console, no constitution slots, no trigger-filter paste UI

### Where to change drafting rules

0. **Shared commercial / beachhead keys** → `lib/ironframeProductKnowledge/` (Path B cents, sector tags, product facts)
1. **Beachhead StoryBrand scaffolding** → `SalesTeam/src/config/beachheadPrompts.ts`  
   Sectors: `REGIONAL_BHC` · `UTILITY_NERC` · `MSSP_ENCLAVE` · `HEALTH_HIPAA`
2. **StoryBrand phrase guardrails** → `SalesTeam/src/config/storybrandGuidelines.ts`
3. **Draft assembly** → `SalesTeam/src/agents/outboundDraftsman.ts` (consumes beachhead + product facts blurb)
4. **Program message lock (CTA / Path B)** → `docs/sales/design-partner-workforce-briefing.md` (federated via design-partner briefing in static context)

After code edits: rebuild/restart the SalesTeam worker so `:8084` poll cycles load the new prompts. Restart IronBoard (`:8082`) so federation + static context reload.

## Message constitution (all drafters)

- CTA = **10–15 min workflow review** (not “Request Demo” / free pilot).
- Workflow review doctrine: [peer-to-peer technical diligence](../sales/design-partner-workflow-review-protocol.md) — clinical architect tone in drafts; **human** hosts the live call.
- Cold open: pain + trigger + collaboration; include **$4,999** Path B once relevance is established (Touch 1 body OK; subject can stay problem-led).
- **Target-specific hooks (Touch 1 and Touch 2):** investigate each prospect’s verified operating motion before drafting; Gate 2 open must name *their* multi-client friction (`As`/`When`/`With…` preferred). Touch 2 = one-line re-anchor + soften/scarcity — never re-send Touch 1 cold opener; see [design-partner-outreach-sequence.md](../sales/design-partner-outreach-sequence.md).
- **Human voice lock:** write spoken founder prose (short sentences, no stacked economics, no word stumbles). Borrow `board-writer` plain-English clarity; do **not** route cold EMAIL through `board-writer`. Helper: `app/lib/salesHumanVoice.ts`. See outreach sequence § Human voice lock.
- Never cite `medshield` / `vaultbank` / `gridcore` as customers or hardened baselines.
- PENDING partners: tenant-scoped Path B link — never generic `/pricing`.
- Operator email: client-owned only (not `@ironframegrc.com`).
- Customer is hero; Ironframe is guide only (StoryBrand for drafts; stripped diligence on the call).

### Claim bans (market narrative — 2026-07-30)

Do **not** put in drafts or board advice:

- “most urgent unmet need,” “proves,” “competitors cannot / must rewrite”
- “true ALE,” “SEC requires FAIR / dollars”
- “boards are rejecting heatmaps” (say: heatmaps alone aren’t the decision layer)
- “nobody builds multi-tenant GRC” / “standard tools are single-entity only” (universal)
- Cherry-picked precise CAGRs without a named source

Canonical framing: [Control-to-Capital narrative](../sales/control-to-capital-market-narrative.md) · [Heatmap Amnesty](../sales/heatmap-amnesty-campaign.md) · `/marketing/heatmap-amnesty`

Lead with **estimated whole-cent exposure + hard enclaves**; framework crosswalk is supporting proof only.

## Operator methodology moves (distilled — not book dumps)

Encode **moves**, not audiobook corpora. IronBoard / SalesTeam / Cursor must follow these as drafting constraints. Full Challenger/SPIN/Gap labels remain methodology playbooks only (`list_sales_playbooks`) — never account truth.

| Move | Do | Don’t |
|------|----|--------|
| **Multi-thread the deal** | Name CISO + risk/finance + operator owner in discovery; WF review invites the people who own evidence *and* exposure | Single-thread a “demo” to one friendly contact |
| **Teach, then ask** | Lead with one insight that reframes their queue (CVSS vs KEV clock; heatmap vs exposure hours; soft tenancy vs legal-entity walls) | Open with product tour, feature list, or “Request Demo” |
| **Take control of next step** | Close every touch on **10–15 min workflow review** + success criterion for a Path B window | Leave “happy to chat anytime” / unbounded pilots |
| **Uncertainty language** | Prefer **estimated loss exposure ranges (P50–P90)** and **active exposure hours** with stated assumptions | Point-dollar ALE theater; “boards are rejecting heatmaps” as universal fact |
| **Negotiate convert-or-exit** | Path B = paid co-builder seat; 90-day convert-or-exit; price once relevance is clear | Free pilots, discount Path B, or invent GA discounts in cold copy |
| **Agent / worker failure modes** | HITL Approvals only; quarantine drafts; no auto-send; never invent buyers or outreach plans | Autonomous “run Challenger on the list” or fabricated GTM Settings UIs |

Canonical commercial anchors stay in `lib/ironframeProductKnowledge/` and [control-to-capital](../sales/control-to-capital-market-narrative.md).

## Beachhead sectors (code keys)

| Tag / ICP label | Code sector | Hero angle (summary) |
|-----------------|-------------|----------------------|
| BHC / multi-entity | `REGIONAL_BHC` | Regional banking CISO — FFIEC board accountability + cents ALE |
| UTIL / OT / NERC | `UTILITY_NERC` | Utility CIP owner — NERC evidence without spreadsheet drift |
| MSSP / vCISO | `MSSP_ENCLAVE` | MSSP governance — hard tenant per client, no cross-bleed |
| HEALTH / HIPAA | `HEALTH_HIPAA` | Healthcare compliance — vendor risk + patient privacy |

Tag shorthand (`BHC`, `UTIL`, `MSSP`) is CRM/ICP labeling. Draft resolution uses the **code sector** strings above via `resolveBeachheadPrompt`.

## Pipeline (do not blur)

```
Ironleads :8083 (SUSPECT harvest)
  → human promote / CRM stage
  → SalesTeam :8084 (PROSPECT draft via /poll + beachheadPrompts)
  → Operator Approvals DISPATCH
  → Path B provision
```

IronBoard advises on ICP, copy, and which sector key to use. Engineers apply changes in the SalesTeam package. Operators approve drafts — they do not paste constitutions into `:8084`.

## Forbidden board advice

Never instruct operators to:

- Open SalesTeam `:8084` as an administration portal
- Navigate **GTM Settings**, **Campaign Engine**, or **Message Constitution** tabs
- Create beachhead “slots” or click **Save & Lock**
- Paste multi-page templates into a SalesTeam UI that does not exist

Correct substitute: “Update `SalesTeam/src/config/beachheadPrompts.ts` (and related draft modules), redeploy SalesTeam, then verify via Ops Hub worker health / next `/poll` cycle.”

## Related documents

- [Design-partner workforce briefing](../sales/design-partner-workforce-briefing.md)
- [Workflow review protocol](../sales/design-partner-workflow-review-protocol.md)
- [Target market research](../sales/target-market-research.md)
- [ICP shortlist](../sales/design-partner-icp-shortlist.md)
- [StoryBrand framework](../marketing-strategy/storybrand-framework.md)
- [Pricing & packaging](../sales/pricing-and-packaging.md)
