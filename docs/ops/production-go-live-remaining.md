# Production go-live — remaining only

Rails, dry-runs, QA throwaway quarantine, and operator hygiene are **done**.  
This file is the only remaining production checklist.

**Do not** Path-B / provision `ironframe-central-test` (QA throwaway).  
Keep `IRONFRAME_PUBLIC_INSTANT_CHECKOUT_ENABLED` and counsel D0 **off** until counsel returns.

---

## 1. Counsel review (D0)

| # | Task | Owner | Status |
|---|------|--------|--------|
| 1.0 | Submit packet to outside counsel | Ops | ☑ 2026-08-01 — requested from **LegalCorps**; awaiting reply |
| 1.1 | Outside counsel returns approved order form + MSA/DPA | Counsel | ☐ waiting on LegalCorps |
| 1.2 | Mark packet counsel-approved (date/firm) in [counsel-review-packet](../sales/counsel-review-packet.md) | Ops | ☐ |
| 1.3 | Set `NEXT_PUBLIC_IRONFRAME_COUNSEL_D0_APPROVED=true` (and server twin if used) → redeploy | Ops | ☐ |

**Until then:** no Path B signature / activation send to a paying partner. Outreach / DISPATCH may proceed.

---

## 2. Stripe live Path B — DONE (2026-07-28)

| # | Task | Status |
|---|------|--------|
| 2.1 | Vercel Production `sk_live_…` (`STRIPE_SECRET_KEY` + `STRIPE_SECRET_KEY_LIVE`) | ☑ |
| 2.2 | Live catalog cutover (Path B $4,999 + year-1 balance $30,001) | ☑ |
| 2.3 | `STRIPE_CREDENTIAL_MODE=live` + live `NEXT_PUBLIC_STRIPE_COMMAND_TIER_CHECKOUT_URL` → redeploy | ☑ |
| 2.4 | Live webhook endpoints + signing secrets on Vercel Production | ☑ |

**Catalog (live):**
- Path B provision: https://buy.stripe.com/14A9AM0jtcWbcR56OQbZe00
- Path B activation: https://buy.stripe.com/14A3cogirf4j5oD4GIbZe01
- Year-1 Command balance: https://buy.stripe.com/9B6fZa8PZaO3aIXb56bZe02

**Webhooks (live mode → ironframegrc.com):**
- `/api/webhooks/stripe` ← `checkout.session.completed` (acks while public instant checkout stays off)
- `/api/billing/webhook` ← `payment_intent.succeeded` (Path B billing ACTIVE)

**Ops hygiene:** `sk_live_` rotated and redeployed 2026-07-28.

---

## 3. Design-partner acquisition & close

Complete **per partner** (HITL only):

| # | Task | Owner |
|---|------|--------|
| 3.1 | Warm intro or live DISPATCH (real email/SMS — not dry-run inbox) | GTM |
| 3.2 | LIVE workflow review → yes | GTM |
| 3.3 | Order form AGREED → Lock → admin handoff | GTM |
| 3.4 | Quick provision (client email + live slug; SoD) | Admin |
| 3.5 | Path B activation link **after D0** → billing ACTIVE | Admin |
| 3.6 | Operator Packet + capped sync; scope freeze | Admin / CS |

Surfaces: Approvals · `/dashboard/operations/workflow-review` · order form · `/admin/onboarding`  
Cadence: [operator launch checklist](../sales/design-partner-operator-launch-checklist.md) §C–D  
ICP: [shortlist](../sales/design-partner-icp-shortlist.md)

**Target:** GTM-3 — 3 paying design partners.

---

## Done (do not re-open)

- FL1 / SaaS QA rails  
- Outreach dry-run (TOUCH1 to operator inbox)  
- `ironframe-central-test` quarantined  
- Partner AppDocuments seeded  
- AGREED handoff + Quick provision polish on `main`
- Stripe live Path B catalog + credential mode + live webhooks (2026-07-28)
