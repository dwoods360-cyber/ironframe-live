# Design-partner ops — surface map

**Audience:** Operator running Path B GTM.  
**In-app:** `/dashboard/operations/library/ops-surface-map`  
**Companions:** [Doc Directory](/dashboard/operations/doc-directory) · [Live motion](../ops/design-partner-live-motion-next.md) · [Glossary](./design-partner-gtm-operator-glossary.md) · [Launch checklist](./design-partner-operator-launch-checklist.md)

One screen → one job. Ignore counts that don’t match the “Look for” column.

---

## How they fit (one loop)

```
IronBoard flywheel (WEEKLY)  ← discover → verify → RESEARCH
        ↓ Gatekeeper promote only
ICP shortlist (§A warm / §D Scout log)     ← plan who to chase
        ↓
Ironleads  →  SUSPECT  →  enrich / promote PROSPECT
        ↓
SalesTeam poll  →  PENDING draft
        ↓
Approvals (SALES)  →  edit locks  →  DISPATCH (HITL)   ← DAILY
        ↓
Prospect books call  →  LIVE workflow-review desk
        ↓
Order form (AGREED)  →  Provision (admin)  →  Path B pay
```

**Flywheel cadence:** preserve the process; run **weekly** as pipeline replenishment — not daily outreach. See [Flywheel weekly replenishment](./design-partner-flywheel-weekly-replenishment.md).

**Warm path shortcut:** §A named buyers often skip Ironleads — you still log touches on the shortlist and may open Approvals only when a draft exists.

**CRM tab** is a raw ledger, not the plan. Prefer shortlist + Approvals.

---

## Surfaces (what / look for)

| Surface | Job | Look for | Ignore / trap |
|---------|-----|----------|----------------|
| **[Ops Hub](/dashboard/operations)** | Home + pipeline counts | Overview: Warm intro kit, Doc Directory, Operator library, LIVE, Approvals | Treating CRM/inbound totals as the ICP plan |
| **[Doc Directory](/dashboard/operations/doc-directory)** | Map of doc *planes* | Operator library · product `/docs` · Publishing · research host | Expecting every `docs/**/*.md` listed here |
| **[Operator library](/dashboard/operations/library)** | Docs + shortlist + forms | This map, ICP shortlist, week-1 Scout, order form | Reading every doc every day |
| **[ICP shortlist](/dashboard/operations/library/icp-shortlist#section-a)** | **Source of truth for who to chase** | §A = five warm cross-section orgs; §D = Scout/DISPATCH log | Expecting §A to appear as Ironleads SUSPECTs automatically |
| **[Week-1 Scout](/dashboard/operations/library/week1-mssp-scout)** | How to feed beachhead D | Hiring / press / evidence → ≥12/20 PROSPECT | Harvesting hundreds of noisy SUSPECTs |
| **[Ironleads](/dashboard/operations/ironleads)** | OSINT harvest → SUSPECT | New triggers; enrich; promote **reachable** rows to PROSPECT | Empty queue ≠ missing §A five; fixture tenants |
| **[SalesTeam](/dashboard/operations/salesteam)** | Draft outreach from PROSPECTs; P1 inbound | **Run poll**; inbound leads strip; 2 real PROSPECTs vs E2E noise | Ironframe/E2E rows as Path B targets |
| **[Approvals SALES](/dashboard/admin/approvals?kind=SALES)** | HITL send gate | Newest PENDING draft per contact; C1 locks → DISPATCH | BlueRadius if HOLD; stale dupes; demo-tenant copy |
| **IronBoard flywheel** (`#market-flywheel`) | **Weekly** pipeline replenishment | One region session → Gatekeeper → promote few | Daily discover binge; treating RESEARCH names as send-ready |
| **[CRM tab](/dashboard/operations?tab=crm)** | Raw contact/deal browse | `prospect-pool` PROSPECTs with real email/phone | Demo slugs (`medshield` / `vaultbank` / `gridcore`); “4 leads” without enrichment |
| **[LIVE / workflow review](/dashboard/operations/workflow-review)** | On-call desk (you host) | Talk track + mic; pocket Q&A; End LIVE → recap | Using it before a booked diligence call |
| **[Order form](/dashboard/operations/library/order-form)** | After verbal yes | 2–3 criteria + client-owned email → AGREED | Sending before counsel D0 / Path B activation |
| **[Provision](/admin/onboarding)** | Mint tenant + Path B link | Client-owned email only; Path B activation URL | Generic `/pricing` for PENDING partners |

---

## Daily 5-minute check

1. **Shortlist §A/§D** — who is next; any touch due?  
2. **Approvals SALES** — any draft ready to DISPATCH?  
3. **SalesTeam inbound** — any P1 human lead?  
4. **Ironleads** — only if you need new Scout fuel.  
5. **LIVE** — only if a workflow review is booked today.

## Weekly (Friday — not daily)

6. **Flywheel replenishment (Friday)** — one region discover/verify session → Gatekeeper → promote 0–3 into next week’s HITL wave ([playbook](./design-partner-flywheel-weekly-replenishment.md)).

---

## Related

| Doc | When |
|-----|------|
| [Flywheel weekly replenishment](./design-partner-flywheel-weekly-replenishment.md) | Weekly pipeline refill (preserve process; not daily outreach) |
| [Pre-outreach run order](./design-partner-pre-outreach-run-order.md) | First-time rail dry-run (R1–R8) |
| [Operator launch checklist](./design-partner-operator-launch-checklist.md) | Batch + close cadence |
| [GTM glossary](./design-partner-gtm-operator-glossary.md) | Term definitions (SUSPECT, DISPATCH, Path B) |
| [Live motion](../ops/design-partner-live-motion-next.md) | What’s still open in production |
