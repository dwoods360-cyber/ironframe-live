# Live design-partner motion (next seat — not QA)

**Do not** provision or Path-B charge `ironframe-central-test` / Ironframe Central Test. That slug is a **QA throwaway** (`[QA THROWAWAY]`). Real buyers get a **client-owned** slug + email.

Counsel D0 stays **off** until counsel returns.

## Operator-owned pass (2026-07-27) — done without 3rd parties

| # | Item | Status |
|---|------|--------|
| 1 | Quarantine `ironframe-central-test` | ☑ |
| 2 | Purge BlueRadius dry-run PENDING requeue `53bbfdde…` | ☑ |
| 3 | Restore CRM email → `info@blueradius.io` | ☑ |
| 4 | Partner AppDocuments (packet + LEVEL1 partner index) | ☑ |
| 5 | Stop further dry-run Touch cadence to self | ☑ |

## Still waiting / human-gated

| # | Item | Owner |
|---|------|--------|
| A | Counsel D0 return + env flip | Counsel → ops |
| B | First **live** DISPATCH or warm intro | GTM |
| C | LIVE → AGREED → provision → Path B charge | GTM + admin (after D0) |
| D | Confirm Stripe **live** Path B ($4,999) before charge | Ops — prod env currently `STRIPE_CREDENTIAL_MODE=test` |

## Ordered motion (HITL only)

| Step | Owner | Action | Stop if |
|------|-------|--------|---------|
| 1 | GTM | Warm §A contact (or auditor intro) → Approvals draft | No real contact/email |
| 2 | GTM | Edit draft locks: $4,999 · workflow review CTA · no free pilot · no demo slugs | Copy fails locks |
| 3 | GTM | **DISPATCH** (email/SMS) — human only · **live** destination | Auto-send / dry-run temptation |
| 4 | GTM | LIVE workflow review | Prospect not a fit |
| 5 | GTM | Order form AGREED → Lock form → admin handoff | Counsel D0 still open → **no Path B send** |
| 6 | Admin | Quick provision from trusted handoff — client email, new slug | Central Test / @ironframegrc.com |
| 7 | Admin | Path B activation link only (after D0 yes) | D0 still off |
| 8 | Admin | Billing ACTIVE → Operator Packet + capped sync | Scope creep |

## Surfaces

- ICP shortlist: `/dashboard/operations/library/icp-shortlist#icp-touch-log`
- Approvals: `/dashboard/admin/approvals?kind=SALES`
- Order form: `/dashboard/operations/library/order-form`
- Provision: `/admin/onboarding`
- Checklist: [design-partner-operator-launch-checklist.md](../sales/design-partner-operator-launch-checklist.md)

## Scripts

```bash
# Hygiene pass (purge stale draft + restore public email)
npx vercel env run -e production -- npx tsx scripts/ops/design-partner-operator-ready-pass.ts --execute

# Read-only Stripe Path B signals
npx vercel env run -e production -- npx tsx scripts/ops/verify-stripe-pathb-live-readiness.ts
```
