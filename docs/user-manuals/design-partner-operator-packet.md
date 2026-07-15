# Design Partner Operator Packet

**Audience:** Design-partner GRC operators · **Reading level:** 11th grade · **Milestone:** v0.1.0-ga-epic17  
**Support:** delivery@ironframegrc.com

This is the **canonical handoff packet** for sales-assisted pilots. Read this before other training tracks. It matches the live cockpit loop: invite → billing → Get Started → Integrity Hub → threats/evidence → exports.

---

## 1. What you receive

| You get | You do not get (yet) |
|---------|----------------------|
| Dedicated tenant host: `https://{your-slug}.ironframegrc.com` | Public self-serve signup |
| Invite email with activation link | Cross-tenant demo switching (`medshield` / `vaultbank` / `gridcore`) |
| Command Tier / Path B Stripe checkout when billing is PENDING | Full three-tier commercial catalog |
| Guided `/get-started` workspace setup | Integration marketplace or unfinished PREVIEW modules as deliverables |

Demo seed workspaces (`medshield`, `vaultbank`, `gridcore`) are **internal engineering fixtures**. Your production slug is the only workspace you operate.

---

## 2. Day 0 — Activate access (about 10 minutes)

1. Open the invite email from Ironframe delivery or sales.
2. Click the activation link. It opens **`/register/{token}`** on your tenant host (or the shared app host that then scopes you to your slug).
3. Set your password and complete credential binding.
4. Sign in at `https://{your-slug}.ironframegrc.com/login` (bookmark this URL).
5. On first entry, complete the **Legal Terms Portal** — accept the MSA and DPA with your full legal name. Acceptance is recorded as an immutable audit entry.

If the invite link is expired or already used, contact **delivery@ironframegrc.com**. Do not try to register from the public pricing or contact pages — those do not create workspaces.

---

## 3. Day 0 — Path B billing (PENDING → ACTIVE)

Until subscription payment clears, training modules, agent workforces, and parts of the documentation corpus stay sealed. You will see **Awaiting subscription confirmation**.

1. On `/get-started` (or a billing hold panel), use **Complete subscription — Stripe Checkout** when a Path B link is shown.  
   Prefer the **tenant-scoped** Path B link from your invite or Get Started panel — not a generic public `/pricing` checkout meant for new recruits.
2. Complete Stripe Checkout with your organization’s payment method.
3. Return to the app and refresh. Billing status should move from **PENDING** to **ACTIVE**.
4. If status stays PENDING after a successful Stripe charge, email delivery@ironframegrc.com with your tenant slug and approximate payment time.

**Command Tier (design-partner on-ramp):** flat platform fee for the pilot evaluation (no per-seat licensing). Your order form / invite notes the exact amount.

Past-due failures after go-live also raise a **Billing Gate** — use **Update Payment Method** on the hold screen, or contact delivery.

---

## 4. Day 1 — Get Started workspace setup (required)

Open **`/get-started`**. Complete these gates **before** relying on Integrity Hub or analyst exports.

### Step A — Workspace ALE baseline

1. Find **Workspace ALE baseline required**.
2. Enter your organization’s **Annualized Loss Expectancy** in USD (example format: `5900000.00`).
3. Click **Save ALE baseline**. The platform stores the value as whole cents.

This sets Integrity Hub scores and board reporting for **your** tenant.

### Step B — Primary GRC company profile

1. After ALE is saved, complete **Define your primary GRC company**.
2. Enter company name, sector, and department fields as prompted.
3. Click **Save company profile**.

This sets up your risk registers and compliance scope. It does **not** create a new tenant, touch sales CRM, or change billing.

### Step C — Orientation checklist

When ALE and company profile are saved, finish the guided checklist:

| Checklist item | Where it goes |
|----------------|---------------|
| Workspace orientation | This packet + quick-start guide |
| Integrity Hub & ALE | `/integrity` |
| Partner training chapters | Design-partner Level 1 index (curated) |
| Trainer sandbox (optional) | Question grounded on verified corpus |
| Audit export path | `/exports` |

---

## 5. Daily cockpit loop

Use this path for partner validation and auditor prep:

1. **Integrity Hub (`/integrity`)** — Confirm your ALE baseline and hazard / protection posture.
2. **Cockpit / hazard pipeline (`/cockpit`)** — Triage live threats; aim for zero unhandled active hazards.
3. **Evidence Locker (`/evidence`)** — Review sealed WORM evidence when you need tamper-evident proof.
4. **Analyst exports (`/exports`)** — Download tenant-scoped CSV or PDF for auditor handoff.

Keep the workspace switcher on **your** tenant. Design-partner operators should not need Global Command Center or seed-tenant switching.

---

## 6. What’s pilot vs preview (do not treat as deliverables)

Nav badges mark pages that are not full deliverables yet:

| Badge | Meaning | Example |
|-------|---------|---------|
| **PILOT** | Demo / seed data — **not** your live tenant database | `/vendors`, supply-chain views |
| **PREVIEW** | Incomplete module; some roles cannot open it | `/reports/dora-eu-resilience` (blocked for `GRC_MANAGER`) |

On PILOT vendor screens you will see **Pilot surface — seed data only**. Demo vendor menus stay off for active workspaces. Use **`/exports`** for real analyst exports.

---

## 7. Support and escalation

| Need | Contact |
|------|---------|
| Invite, login, billing stuck PENDING | delivery@ironframegrc.com |
| Product how-to after activation | In-app Trainer on `/get-started` (after billing ACTIVE) |
| Security / urgent production issue | Same delivery channel with tenant slug, timestamp, and browser |

---

## Related Level 1 manuals

- [Quick-Start](./quickstart.md) — layout and legal sign-off detail  
- [Get Started workspace setup](./get-started-workspace-setup.md) — ALE + company deep dive  
- [Dashboard guide](./dashboard-guide.md) — Integrity Hub daily ops  
- [Audit exports](./audit-exports.md) — CSV/PDF walkthrough  
- [Pilot vs preview surfaces](./pilot-vs-preview.md) — badge policy  
- [Glossary](./glossary.md) — plain-English terms  
- [Partner training index](/docs/training/LEVEL1-PARTNER-INDEX) — curated chapters only  

**Do not** use internal ops checklists, sales SKU drafts, or the full classroom seed labs as your operating guide.
