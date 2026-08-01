# Live design-partner motion

**Canonical remaining list:** [production-go-live-remaining.md](./production-go-live-remaining.md)  
**Workstation:** Ironframe ops on the **Windows Cursor box** — [Windows migration checklist](./windows-workstation-migration.md) (Task Scheduler + secrets + GTM smoke). Prior note: [Mac sunset handoff](./workstation-handoff-2026-07-29.md).

Open tracks: **counsel D0 (waiting on LegalCorps)** · **design-partner acquisition/close** (Ironleads → live DISPATCH → close).  
**Stripe live Path B:** done 2026-07-28.  
**Counsel:** packet submitted to **LegalCorps** 2026-08-01 — awaiting reply (D0 product gate stays **off**).

Never Path-B / provision `ironframe-central-test` (QA throwaway).  
Keep public instant checkout and counsel D0 **off** until LegalCorps returns approved text.

## Surfaces

**How to use them together (what / look for):** [Ops surface map](../sales/design-partner-ops-surface-map.md) · in-app `/dashboard/operations/library/ops-surface-map`

| Step | URL |
|------|-----|
| Ops surface map | `/dashboard/operations/library/ops-surface-map` |
| Ironleads harvest | `/dashboard/operations/ironleads` |
| SalesTeam poll | `/dashboard/operations/salesteam` |
| Approvals | `/dashboard/admin/approvals?kind=SALES` |
| LIVE desk | `/dashboard/operations/workflow-review` |
| Order form | `/dashboard/operations/library/order-form` |
| Provision | `/admin/onboarding` |
| ICP shortlist §A/§D | `/dashboard/operations/library/icp-shortlist` |
| First-close Packet handoff | `/dashboard/operations/library/first-close-handoff` |
| Operator checklist | [design-partner-operator-launch-checklist.md](../sales/design-partner-operator-launch-checklist.md) |

## Ironleads loop (while waiting on counsel)

**This week:** beachhead **D — MSSP / vCISO** ([week-1 Scout playbook](../sales/design-partner-week1-mssp-scout-playbook.md)).

1. `/dashboard/operations/ironleads` → **Run harvest cycle** → optional **Research buying committee**
2. Promote reachable SUSPECTs to **PROSPECT** on `prospect-pool` (tag `MSSP_ENCLAVE`; real email/phone; SMS if `@ironleads.local`)
3. `/dashboard/operations/salesteam` → **Run poll cycle**
4. Edit + live DISPATCH from Approvals → log on shortlist §D  
   Cap: **10–15** ≥12/20 reachable PROSPECTs — not feed noise.  
   CLI check: `node scripts/dev/b3-list-prospects.mjs`  
   **Day 1–2:** live DISPATCH reachable PROSPECTs (e.g. Pivot Point SMS) before waiting on new feeds. **BlueRadius = HOLD** (real; Radius360 overlap — not next Path B cold).

Detail: [pre-outreach R4](../sales/design-partner-pre-outreach-run-order.md) · [ICP shortlist §D](../sales/design-partner-icp-shortlist.md).
