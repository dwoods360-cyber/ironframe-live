# Design partner recruitment (Ironframe)

**Status:** Active · cohort of 3–5 paying co-builders  
**Companion:** [Market entrance playbook](./market-entrance-playbook.md) · [Pilot checklist FL1-UX](../ops/pilot-to-commercial-readiness-checklist.md#post-fl1--entity-plane-ux-naming-pass)

Finding design partners is not a volume game. Recruit **3–5 referenceable co-builders** with the exact pain Ironframe solves, in exchange for early access and a locked pilot — not ads volume.

**Do not pitch like a sales demo.** Position an exclusive cohort with line-of-sight to the product (bounded engineering syncs).

---

## Pre-outreach gate (do this first)

**Authoritative run order (R1–R8, ~30–45 min):**  
[design-partner-pre-outreach-run-order.md](./design-partner-pre-outreach-run-order.md) · in-app `/dashboard/operations/library/pre-outreach-run-order`

Hard gates: DISPATCH dry-run to yourself · LIVE call assist · Push to calendar. Do not start cold partner DISPATCH until sign-off is **GO**.

### Spot-checks still required

| # | Task | Status / how |
|---|------|----------------|
| 1 | **UX naming hygiene** | Already shipped (FL1-UX): `/register/contact` = lead only; `/admin/onboarding` labels **Path B activation link**; `/get-started` Step 2 = in-tenant GRC company ≠ sales CRM. Re-spot-check live before a campaign. |
| 2 | **Stripe Path B** | Confirm tenant-scoped activation checkout is live. Never send existing PENDING partners to generic `/pricing` (duplicate workspace risk). |
| 3 | **Operator email** | Quick-provision uses a **client-owned** mailbox (`ciso@acme.com`), never `@ironframegrc.com` — **enforced in** `quickProvisionCorporateWorkspaceCore` (rejects `@ironframegrc.com`). |

---

## Board-first operating path (required)

Human outbound still goes through the board / workforce — not ad-hoc founder email alone.

```
Ironleads / Industry Scout (leadgen signals)
        → board-sales-lead + Marketing (co-builder pitch, ICP fit)
        → SalesTeam PROSPECT draft (EMAIL or SMS) → /dashboard/admin/approvals
        → Operator DISPATCH (Resend email or Textbelt SMS)
        → Admin Path B provision (client operator email)
        → Partner on /get-started (ALE + primary GRC company)
```

| Role | Surface | Does |
|------|---------|------|
| **Leadgen** | Ironleads · Industry Scout · CRM `list_leadgen_knowledge` | Triggers: funding, hiring, audit pressure |
| **Sales** | `board-sales-lead` · SalesTeam · Approvals | Co-builder draft; never auto-send |
| **Writer** | `board-writer` (isolated docs plane) | Narrative / training docs — **not** live cold email; use flywheel pitch pane + SalesTeam for outreach copy |
| **You (operator)** | Approvals + `/admin/onboarding` | DISPATCH + Path B link + client-owned invite |

IronBoard chat: use for ICP / pricing / cohort decisions — not daily spray.

---

## Four highest-converting channels

| Channel | Speed | Notes |
|---------|-------|--------|
| **1. Warm network & advisors** | Fastest first doors | Ask who is standing up SOC 2 / ISO / ESG with friction — not “buy our tool.” |
| **2. Auditor / consultant ecosystem** | High trust, slower open | A-LIGN-class / boutique auditors — amplify after one clean pilot reference. |
| **3. Trigger signals** | Medium | Funding, first GRC hire, enterprise questionnaires — productize via Ironleads Scout. |
| **4. Direct ICP co-builder outreach** | Medium | CISO / VP Infra / Compliance — sell roadmap influence + locked pilot. |

### Co-builder outreach (cold)

Never lead with a brochure or a 30-minute demo. Sell cohort seats.

- **Offer:** Weekly syncs **capped** (e.g. first 4–6 weeks, then async) — protect scope freeze.  
- **Commercial:** Command Tier / Path B on-ramp **$4,999** (not generic `/pricing` for existing PENDING).  
- **GA reference:** Planned Ironframe Command **~$35k/yr** (`FINTECH_SEED`) — say “planned GA” until commercial GA flag is on.  
- **CTA:** 10–15 min **workflow review** on their evidence pain — not “product preview.”

### Agreement rules

1. **Charge the pilot** ($4,999) — free partners rarely log in.  
2. **2–3 success criteria** up front (e.g. SOC 2 evidence export; vendor questionnaire time).  
3. **90-day** default window (floor 60 if scoped in writing) → convert or exit. In-window convert: Path B fee credited to year-1 Command (fixed credit, not a negotiated %). Exit: Path B non-refundable.

---

## GTM package (use these)

| Asset | Path |
|-------|------|
| **Operator library (in-app directory)** | `/dashboard/operations/library` |
| Pre-outreach dry-run | [design-partner-pre-outreach-run-order.md](./design-partner-pre-outreach-run-order.md) |
| GTM operator glossary | [design-partner-gtm-operator-glossary.md](./design-partner-gtm-operator-glossary.md) |
| Workforce briefing (RACI) | [design-partner-workforce-briefing.md](./design-partner-workforce-briefing.md) |
| Offer sheet | [design-partner-offer-sheet.md](./design-partner-offer-sheet.md) |
| Outreach sequence | [design-partner-outreach-sequence.md](./design-partner-outreach-sequence.md) |
| Workflow review protocol | [design-partner-workflow-review-protocol.md](./design-partner-workflow-review-protocol.md) |
| LIVE call assist | `/dashboard/operations/workflow-review` |
| Order form | [design-partner-order-form.md](./design-partner-order-form.md) |
| Operator launch checklist | [design-partner-operator-launch-checklist.md](./design-partner-operator-launch-checklist.md) |
| Partner operator packet (in-app) | [`/docs/user-manuals/design-partner-operator-packet`](../user-manuals/design-partner-operator-packet.md) |
| Partner training index | [`/docs/training/LEVEL1-PARTNER-INDEX`](../training/LEVEL1-PARTNER-INDEX.md) |
| ICP shortlist | [design-partner-icp-shortlist.md](./design-partner-icp-shortlist.md) |
| Target market | [target-market-research.md](./target-market-research.md) |
| Battlecard | [battlecard-ironframe-vs-vanta-drata.md](./battlecard-ironframe-vs-vanta-drata.md) |
| Pricing | [pricing-and-packaging.md](./pricing-and-packaging.md) · live `/pricing` shows **$4,999** |

## Related surfaces

- Operator library: `/dashboard/operations/library`  
- LIVE workflow-review assist: `/dashboard/operations/workflow-review`  
- Lead form (no workspace): `/register/contact`  
- Provision + Path B: `/admin/onboarding`  
- Partner day-1: `/get-started`  
- Partner packet: `/docs/user-manuals/design-partner-operator-packet`  
- Partner training: `/docs/training/LEVEL1-PARTNER-INDEX`  
- Docs sync (ops): [design-partner-docs-sync.md](../ops/design-partner-docs-sync.md)  
- HITL send: `/dashboard/admin/approvals`
