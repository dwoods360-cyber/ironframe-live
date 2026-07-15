# Audit export path (Level 1)

**Live console:** `/exports`  
**Reading level:** 11th grade · **Milestone:** v0.1.0-ga-epic17

Download a CSV or PDF for your tenant. Use it for auditor handoff.

Exports unlock when:

1. Billing is **ACTIVE**
2. Get Started workspace steps are done

> Old links to `/dashboard/exports` send you to `/exports`. Always use **`/exports`**.

---

## Prerequisites

| Gate | Where to fix it |
|------|-----------------|
| Billing **ACTIVE** | Path B Stripe Checkout on `/get-started` or the billing hold panel |
| Workspace ALE baseline saved | `/get-started` → workspace ALE section |
| Primary GRC company saved | `/get-started` → company profile |
| Correct tenant | Stay on your design-partner slug (not Global Command) |

If a banner blocks download, follow its link back to Get Started. Then return here.

---

## Reference screenshot

![Audit trail reports and forensic exports](/docs/training/assets/level-2-05-audit-trail-exports.png)

*Analyst export console — CSV, PDF, and sealed ledger controls for the active tenant.*

---

## Operator walkthrough

1. Confirm you are on your workspace (`https://{your-slug}.ironframegrc.com`).
2. Open **`/exports`** (or choose Exports in the nav).
3. Choose **CSV** or **PDF** for your tenant.
4. Save the file with a timestamp and your tenant name for the auditor.

Do **not** use PILOT vendor screens for auditor CSV. Those pages show demo data only. See [pilot vs preview](./pilot-vs-preview.md).

---

## Billing and access gate

Until payment clears, `/exports` may show a billing notice instead of the full console. Finish Get Started and Path B first. Training checklist steps can still write audit entries where enabled.

---

## Related reading

- [Design Partner Operator Packet](./design-partner-operator-packet.md)
- [Get Started workspace setup](./get-started-workspace-setup.md)
- [Master operator guide](./user-guide.md)
- [Evidence Locker lab](/docs/training/level-1/05-evidence-vault)
