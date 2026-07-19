# Design-partner launch — workforce briefing (authoritative)

**Status:** Active rollout · paid Path B cohort  
**Audience:** All Ironboard personas + perimeter workers (Ironleads, SalesTeam, SuccessTeam, SupportTeam) + human operator  
**Commercial lock:** Command Tier / Path B **$4,999** · planned GA **~$35k/yr** · **3–5** co-builders · **90-day** default window (floor 60 if scoped in writing) · **2–3** success criteria  
**GTM rule:** **Multiple acquisition channels · one partner program** (never a free forever cohort beside Path B)

Canonical human docs: [recruitment](./design-partner-recruitment.md) · [offer sheet](./design-partner-offer-sheet.md) · [outreach sequence](./design-partner-outreach-sequence.md) · [workflow review protocol](./design-partner-workflow-review-protocol.md) · [order form](./design-partner-order-form.md) · [launch checklist](./design-partner-operator-launch-checklist.md) · [ICP shortlist](./design-partner-icp-shortlist.md)

---

## Collaboration RACI (one loop)

```
Ironleads / Scout → Marketing + Sales Lead (ICP / message) → SalesTeam draft
        → Operator Approvals DISPATCH → Path B provision (client email)
        → Partner /get-started → SuccessTeam success plan
        → SupportTeam only on break/fix tickets
Writer / Trainer → docs & operator packet (never cold email)
```

| Role | Owns | Does **not** |
|------|------|----------------|
| **board-bot / CEO** | Scope freeze, prioritization, cohort seat count | Spray outbound |
| **board-marketing-mgr** | Category language, warm/auditor blurbs, StoryBrand coherence | Live DISPATCH |
| **board-sales-lead** | Draft QA, beachhead fit, $4,999 / workflow-review CTA; pre-call diligence brief | Auto-send; hosting the live workflow review |
| **Ironleads** | SUSPECT harvest on triggers (funding, GRC hire, audit, fine) | Closing or Path B invite |
| **SalesTeam** | PROSPECT EMAIL/SMS drafts (HITL) — peer/clinical tone | CLOSED_WON advisories; live calls |
| **board-writer** | Partner docs, offer/one-pager clarity, StoryBrand structure | Cold outreach copy-as-send |
| **board-trainer** | LEVEL1 partner index / get-started clarity | Pipeline tactics |
| **SuccessTeam / board-CS** | Post-ACTIVE success plan against order-form criteria | Outbound prospecting |
| **SupportTeam** | Path B billing-hold, invite/login, export blockers | Sales pitches |
| **Operator (human)** | Host [workflow review](./design-partner-workflow-review-protocol.md); DISPATCH; provision; Path B; order form | Letting agents auto-send or run the live call |

---

## Acquisition strategies (use several)

1. **Warm network / advisors** — highest conversion; ask for intro to spreadsheet/heatmap pain owners.  
2. **Auditor / consultant intros** — after one clean reference export.  
3. **Trigger / Scout outbound** — Ironleads → PROSPECT.  
4. **Selective cold ICP** — problem-led 15-min open; Path B commercials after interest.  

**Do not** run freemium / free forever design partners. Gift-first may mean a short **workflow review** door — then Path B close.

---

## Message constitution (all drafters)

**Where it lives:** code + this briefing — **not** a SalesTeam `:8084` admin UI.  
Canonical board ingest: [`docs/sales-enablement/message-constitution.md`](../sales-enablement/message-constitution.md).  
Beachhead scaffolding: `SalesTeam/src/config/beachheadPrompts.ts` (`REGIONAL_BHC` · `UTILITY_NERC` · `MSSP_ENCLAVE` · `HEALTH_HIPAA`).  
SalesTeam HTTP surface is `GET /health` + `POST /poll` only — no GTM Settings / Message Constitution / Save & Lock portal.

- CTA = **10–15 min workflow review** (not “Request Demo” / free pilot).  
- Workflow review = [peer-to-peer technical diligence](./design-partner-workflow-review-protocol.md) — human hosts; drafts use the same clinical tone.  
- Cold open: pain + trigger + collaboration; include **$4,999** Path B once relevance is established (Touch 1 body OK; subject can stay problem-led).  
- Never cite `medshield` / `vaultbank` / `gridcore` as customers or “hardened baselines.”  
- PENDING partners: tenant-scoped Path B link — never generic `/pricing`.  
- Operator email: client-owned only (not `@ironframegrc.com`).
---

## Success handoff (after ACTIVE)

1. Success plan = the **2–3** order-form criteria.  
2. Cadence: capped weekly eng syncs **4–6 weeks**, then async.  
3. By day 90: convert at locked discount or clean exit.  
4. Advocacy only after a documented outcome (export / board pack).

---

## Daily operator rhythm (≤15 min)

| Minutes | Surface | Actor |
|---------|---------|-------|
| 5 | Ironleads / Scout priority | Leadgen + Marketing |
| 5 | Approvals SALES drafts | Sales Lead + Operator |
| 5 | Provision / Path B / CS advisory | Operator + Success |

IronBoard chat: ICP / pricing / cohort decisions only — not daily spray.
