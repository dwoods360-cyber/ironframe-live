# Live design-partner motion (next seat — not QA)

**Do not** provision or Path-B charge `ironframe-central-test` / Ironframe Central Test. That slug is a **QA throwaway** (quarantine with `[QA THROWAWAY]` prefix). Real buyers get a **client-owned** slug + email.

Counsel D0 stays **off** until counsel returns (`NEXT_PUBLIC_IRONFRAME_COUNSEL_D0_APPROVED` / `IRONFRAME_COUNSEL_D0_APPROVED` must not be `true`).

## Ordered motion (HITL only)

| Step | Owner | Action | Stop if |
|------|-------|--------|---------|
| 1 | GTM | Warm §A contact (or auditor intro) → Approvals draft | No real contact/email |
| 2 | GTM | Edit draft locks: $4,999 · workflow review CTA · no free pilot · no demo slugs | Copy fails locks |
| 3 | GTM | **DISPATCH** (email/SMS) — human only | Auto-send temptation |
| 4 | GTM | LIVE workflow review at `/dashboard/operations/workflow-review` | Prospect not a fit |
| 5 | GTM | Order form AGREED → Lock form → admin handoff baton | Counsel D0 still open → **no Path B send** |
| 6 | Admin (SoD) | Quick provision from trusted handoff (`?handoff=`) — **client email**, new slug | Using Central Test / @ironframegrc.com |
| 7 | Admin | Send **Path B activation link only** (not `/pricing`) after D0 yes | D0 still off |
| 8 | Admin | Billing ACTIVE → Operator Packet + capped sync | Scope creep |

## Surfaces

- ICP shortlist (C3): `/dashboard/operations/library/icp-shortlist#icp-touch-log`
- Approvals: `/dashboard/admin/approvals?kind=SALES`
- Order form: `/dashboard/operations/library/order-form`
- Provision: `/admin/onboarding` (prefer handoff URL from Lock form)
- Checklist: [design-partner-operator-launch-checklist.md](../sales/design-partner-operator-launch-checklist.md)

## Quarantine QA throwaway (ops)

| # | Task | Done |
|---|------|------|
| **1** | Quarantine slug `ironframe-central-test` (`--execute`) | ☑ 2026-07-27 — name `[QA THROWAWAY] Ironframe Central Test`; billing `PENDING`; roles/invites/handoffs already clear on re-run |

```bash
npx vercel env run -e production -- npx tsx scripts/ops/quarantine-qa-throwaway-tenant.ts --slug ironframe-central-test
npx vercel env run -e production -- npx tsx scripts/ops/quarantine-qa-throwaway-tenant.ts --slug ironframe-central-test --execute
```

Removes role rows for that tenant only; **does not** delete platform-admin auth users. Forces billing `PENDING` and prefixes the display name.
