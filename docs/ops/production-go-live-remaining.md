# Production go-live — remaining only

Rails, dry-runs, QA throwaway quarantine, and operator hygiene are **done**.  
This file is the only remaining production checklist.

**Do not** Path-B / provision `ironframe-central-test` (QA throwaway).  
Keep `IRONFRAME_PUBLIC_INSTANT_CHECKOUT_ENABLED` and counsel D0 **off** until counsel returns.

---

## 1. Counsel review (D0)

| # | Task | Owner |
|---|------|--------|
| 1.1 | Outside counsel returns approved order form + MSA/DPA | Counsel |
| 1.2 | Mark packet counsel-approved (date/firm) in [counsel-review-packet](../sales/counsel-review-packet.md) | Ops |
| 1.3 | Set `NEXT_PUBLIC_IRONFRAME_COUNSEL_D0_APPROVED=true` (and server twin if used) → redeploy | Ops |

**Until then:** no Path B signature / activation send to a paying partner.

---

## 2. Stripe live Path B

| # | Task | Owner |
|---|------|--------|
| 2.1 | Ensure Vercel Production has `sk_live_…` (`STRIPE_SECRET_KEY` or `STRIPE_SECRET_KEY_LIVE`) | Ops |
| 2.2 | Run live catalog cutover (local terminal — agent sandbox redacts Stripe secrets) | Ops |
| 2.3 | Set `STRIPE_CREDENTIAL_MODE=live` + **live** (non-`/test_`) `NEXT_PUBLIC_STRIPE_COMMAND_TIER_CHECKOUT_URL` → redeploy | Ops |

```bash
bash scripts/ops/run-stripe-pathb-live-cutover.sh
# or:
STRIPE_CREDENTIAL_MODE=live npm run stripe:provision-catalog:production
```

Prod today: mode `test`, checkout `buy.stripe.com/test_…` (intentional pilot; flip before first real charge).

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
