# Design partner recruitment (Ironframe)

**Status:** Active · cohort of 3–5 paying co-builders  
**Companion:** [Market entrance playbook](./market-entrance-playbook.md) · [Pilot checklist FL1-UX](../ops/pilot-to-commercial-readiness-checklist.md#post-fl1--entity-plane-ux-naming-pass)

Finding design partners is not a volume game. Recruit **3–5 referenceable co-builders** with the exact pain Ironframe solves, in exchange for early access and a locked pilot — not ads volume.

**Do not pitch like a sales demo.** Position an exclusive cohort with line-of-sight to the product (bounded engineering syncs).

---

## 30-minute pre-outreach checklist

Complete before the first outreach batch:

| # | Task | Status / how |
|---|------|----------------|
| 1 | **UX naming hygiene** | Already shipped (FL1-UX): `/register/contact` = lead only; `/admin/onboarding` labels **Path B activation link**; `/get-started` Step 2 = in-tenant GRC company ≠ sales CRM. Re-spot-check live before a campaign. |
| 2 | **Stripe Path B** | Confirm tenant-scoped activation checkout is live. Never send existing PENDING partners to generic `/pricing` (duplicate workspace risk). |
| 3 | **Operator email** | Quick-provision uses a **client-owned** mailbox (`ciso@acme.com`), never `@ironframegrc.com` — **enforced in** `quickProvisionCorporateWorkspaceCore` (rejects `@ironframegrc.com`). |

**Agree:** Yes — this checklist is the right gate. Item 1 is verify-not-rebuild; items 2–3 are hard blockers before paid cohort outreach.

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
3. **60–90 day** fixed window → convert or exit at locked discount.

---

## GTM package (use these)

| Asset | Path |
|-------|------|
| Offer sheet | [design-partner-offer-sheet.md](./design-partner-offer-sheet.md) |
| Outreach sequence | [design-partner-outreach-sequence.md](./design-partner-outreach-sequence.md) |
| Order form | [design-partner-order-form.md](./design-partner-order-form.md) |
| Operator launch checklist | [design-partner-operator-launch-checklist.md](./design-partner-operator-launch-checklist.md) |
| ICP shortlist | [design-partner-icp-shortlist.md](./design-partner-icp-shortlist.md) |
| Target market | [target-market-research.md](./target-market-research.md) |
| Battlecard | [battlecard-ironframe-vs-vanta-drata.md](./battlecard-ironframe-vs-vanta-drata.md) |
| Pricing | [pricing-and-packaging.md](./pricing-and-packaging.md) · live `/pricing` shows **$4,999** |

## Related surfaces

- Lead form (no workspace): `/register/contact`  
- Provision + Path B: `/admin/onboarding`  
- Partner day-1: `/get-started`  
- HITL send: `/dashboard/admin/approvals`
