# Design-partner workflow review — Peer-to-Peer Technical Diligence Protocol

**Status:** Authoritative operator talk track for the **10–15 minute workflow review**  
**Plane:** **Ops GTM / Path B** (sales diligence) — **not** Governance Frame research · **not** GFP curriculum  
**Audience:** Human operator (host) · `board-sales-lead` call briefs · SalesTeam draft tone  
**Not for:** Live agent-led calls with prospects · product demos · free pilots · GF research pages  
**Companions:** [Offer sheet](./design-partner-offer-sheet.md) · [Order form](./design-partner-order-form.md) · [Battlecard](./battlecard-ironframe-vs-vanta-drata.md) · [Sales enablement](./sales-enablement.md) · [Pre-outreach run order](./design-partner-pre-outreach-run-order.md) · [GTM operator glossary](./design-partner-gtm-operator-glossary.md)

**In-call tools (Ops Hub):**  
- LIVE assist — `/dashboard/operations/workflow-review` (mic STT, Pocket Q&A, End LIVE → recap, Push to calendar)  
- Operator library — `/dashboard/operations/library`  
- Printable talk track (Command Post chrome) — `/operator/workflow-review-protocol.html`

---

## Doctrine

Enterprise risk / CISO / infra leads tune out polished multi-stage sales scripts. The workflow review is **peer-to-peer technical diligence**: collaborative, direct, slightly clinical — a senior systems architect diagnosing architectural pain, not selling a dream.

| Role | Who |
|------|-----|
| **Host on the wire** | Human operator (founder / designated closer) |
| **Prep + Q&A sidecar** | `board-sales-lead` (brief before; answers when asked) |
| **Draft language only** | SalesTeam / outreach — same tone; never auto-conduct the call |

**StoryBrand (stripped):** Prospect = hero battling evidence / isolation / board-dollar debt. Ironframe = engineering guide. Plan = Path B window + written criteria + capped syncs. Climax = defendable cents math + tenant walls + auditor-ready exports — not a marketing arc on the call.

---

## 15-minute micro-agenda

| Time | Phase | Objective | Conversational pivot |
|------|-------|-----------|----------------------|
| 0:00–3:00 | **Ingress diagnosis** | They name the pain | “Skip the high-level pitch — where does evidence collection debt, board-dollar opacity, or multi-entity bleed show up in your stack today?” |
| 3:00–8:00 | **Structural mapping** | Map pain → patterns (not demo tenants) | “Here’s how we handle that structurally: containment at the database / tenant boundary (PostgreSQL RLS + Ironguard), Irongate before persist, ALE in integer cents — not color charts.” |
| 8:00–12:00 | **Path B invariant** | Hard commercial frame | “We don’t run endless discovery. Fixed **90-day** paid co-builder seat at **$4,999**. We prove **2–3 written success metrics** or we part ways.” |
| 12:00–15:00 | **Engineering gate** | Lock next step | “If this fits: order form with your 2–3 criteria → we provision with your operator email → tenant-scoped Path B activation link. Not a pitch deck. Not generic `/pricing`.” |

Use booking context / Scout trigger / role — do **not** invent “architecture notes from the form” unless they actually submitted them.

---

## Structural mapping — allowed patterns

Speak in **architecture patterns** tied to beachheads (`REGIONAL_BHC` · `UTILITY_NERC` · `MSSP_ENCLAVE` · `HEALTH_HIPAA`):

- Multi-entity / affiliate walls → RLS + tenant isolation  
- MSSP client enclaves → hard per-client boundaries  
- Board pack → BigInt ALE in whole cents  
- External intel → Irongate sanitize-before-persist  
- Auditor path → tenant-scoped exports  

**Banned on this call:** citing `medshield` / `vaultbank` / `gridcore` as customers or “hardened baselines.” Those are synthetic demo seeds only.

---

## Quick-fire Q&A (operator pocket)

| They ask | You say |
|----------|---------|
| “Are you SOC 2 certified?” | “We’re **SOC2-aligned** in architecture and controls; we are **not** claiming a completed SOC 2 Type II logo today. Diligence is migrations, RLS paths, gateway rules, and your Path B criteria — not paperwork theater.” |
| “Can we do a free trial / 30-day PoC?” | “No free tier or loose trial. Entry is flat **$4,999** for a **90-day** scoped engagement so both teams stay in the trench. Convert or exit on criteria you write.” |
| “How do you handle risk financialization?” | “No qualitative 5×5 heatmaps as the board truth. Reporting math is **integer cents** (BigInt). Exposure tracks to dollar boundaries from live constraints — narrative agents don’t invent ALE.” |
| “We’re already on Vanta/Drata.” | “Keep them for checklist continuous control if that job is done. We quantify loss exposure and isolate entities — different buying job.” (See battlecard.) |
| “Show me a demo.” | “This slot is workflow diligence. Product walk is after Path B interest / criteria — not instead of them.” |

---

## Pre-call brief (ask `board-sales-lead`)

Operator asks IronBoard before the call for a one-pager:

1. Prospect / trigger / beachhead sector  
2. Likely pain hypothesis (evidence, isolation, board $)  
3. Path B language lock ($4,999 · 90-day · workflow-review CTA already used)  
4. Bans for this account  
5. Suggested 2–3 success-criteria starters (not closed until they name them)

On the call: human hosts; agent answers only when the operator asks.

---

## After a yes

1. Complete [order form](./design-partner-order-form.md) (2–3 criteria).  
2. Provision with **client-owned** operator email.  
3. Send **tenant-scoped Path B link** only.  
4. On ACTIVE → `/get-started` + operator packet / LEVEL1 partner index → SuccessTeam owns the plan.

**Not the gate:** mutual NDA + reviewing their schema as the immediate next step after this call (may appear later under Path B if scoped).

---

## Draft tone lock (SalesTeam / outreach)

When drafting materials that mention the workflow review, match this protocol:

- Peer / clinical / architectural — not polished sales stages  
- CTA = workflow review, not Request Demo  
- Never demo slugs as customers  
- Path B dollars and window explicit once relevance is established  

Full constitution: [message-constitution.md](../sales-enablement/message-constitution.md) · spine: `lib/ironframeProductKnowledge`.
