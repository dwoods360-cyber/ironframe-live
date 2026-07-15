# Get Started — workspace setup (Level 1)

**Audience:** Design-partner operators · **Milestone:** v0.1.0-ga-epic17  
**In-app route:** `/get-started`

After invite login and legal acceptance, `/get-started` is the **source of truth** for first-day workspace configuration. Analyst exports and guided training stay blocked or incomplete until these gates pass.

---

## Prerequisites

- You can sign in on `https://{your-slug}.ironframegrc.com`
- Legal MSA/DPA accepted
- Billing **ACTIVE** (or you can still save ALE/company while pending — training corpus unlocks after ACTIVE)

---

## Gate 1 — ALE baseline

**UI section id:** `#workspace-ale-baseline`

1. Open `/get-started`.
2. Enter **ALE baseline (USD)** — your organization’s annualized loss expectancy.
3. Click **Save ALE baseline**.

Ironframe stores the value as integer cents. Integrity Hub and board reports use this tenant-scoped baseline.

If exports show an ALE scope banner, return here, save a non-zero baseline, then open `/exports` again.

---

## Gate 2 — Primary GRC company

**UI section:** Define your primary GRC company / GRC company profile

1. Complete company name, sector, and department picklists.
2. Click **Save company profile**.

Effects:

- Initializes in-tenant risk registers and compliance scope
- Does **not** mint a new tenant subdomain
- Does **not** update sales CRM or billing

Until this is saved, the guided checklist may stay locked with a prompt to complete the company profile.

---

## Gate 3 — Orientation checklist

Complete the five Get Started steps (orientation → Integrity Hub → partner training → Trainer → exports). Mark progress as you go; progress is stored in your browser for this device.

---

## Related

- [Design Partner Operator Packet](./design-partner-operator-packet.md)
- [Audit exports](./audit-exports.md)
- [Quick-Start](./quickstart.md)
