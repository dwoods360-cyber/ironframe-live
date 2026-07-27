# Live design-partner motion

**Canonical remaining list:** [production-go-live-remaining.md](./production-go-live-remaining.md)

Only three production tracks are open: **counsel D0**, **Stripe live Path B**, **design-partner acquisition/close**.

Never Path-B / provision `ironframe-central-test` (QA throwaway).

## Surfaces

| Step | URL |
|------|-----|
| Approvals | `/dashboard/admin/approvals?kind=SALES` |
| LIVE desk | `/dashboard/operations/workflow-review` |
| Order form | `/dashboard/operations/library/order-form` |
| Provision | `/admin/onboarding` |
| ICP shortlist | `/dashboard/operations/library/icp-shortlist` |
| Operator checklist | [design-partner-operator-launch-checklist.md](../sales/design-partner-operator-launch-checklist.md) |

## Cutover helper (Stripe live)

```bash
bash scripts/ops/run-stripe-pathb-live-cutover.sh
```
