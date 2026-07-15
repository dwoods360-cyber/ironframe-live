# Ironframe GRC — Complete Beginner User Guide

> **Reading level:** 11th grade · **Audience:** New users with no prior GRC or Ironframe experience  
> **Canonical path:** `/docs/user-manuals/user-guide` · **Master operator manual**

**Design partners:** use the [Design Partner Operator Packet](./design-partner-operator-packet.md) and [Partner training index](../training/LEVEL1-PARTNER-INDEX.md) first. This longer guide may mention seed demos and admin tools that do not apply to your slug.

This guide follows the GRC workflow: **identify → assess → mitigate → monitor**. Each step maps to a live Ironframe route.

---

## 1. Introduction — What is Ironframe?

Ironframe is a **Governance, Risk, and Compliance (GRC)** platform. It helps you:

- **Governance** — Set rules and roles (who can do what)
- **Risk** — Measure money at risk (ALE) and threats
- **Compliance** — Prove controls to auditors with locked evidence

> **Quick tip:** Think of Ironframe as a command center with three panels: data on the left (22%), your work in the center (48%), and audit logs on the right (30%).

![Command Center layout](/docs/training/assets/level-1-03-dashboard-navigation.png)

**Related reading:** [Glossary](./glossary.md) · [Operator packet](./design-partner-operator-packet.md) · [Partner training](../training/LEVEL1-PARTNER-INDEX.md)

source-file: docs/TAS.md  
source-file: config/route-manifest.v0.1.0-ga-epic17.json

---

## 2. Getting Started

### 2.1 Account access

1. Open your **sales-assisted invitation** email (public signup is off).
2. Open **`/register/{token}`** from the invite, then sign in at `https://{your-slug}.ironframegrc.com/login`.
3. Accept the **MSA/DPA** at `/legal/accept` when asked.
4. If status is **PENDING**, finish Path B billing. Then open **`/get-started`** to save ALE and company profile before you rely on exports.

> **Design partners:** Stay on your assigned slug. Seed tenants (`medshield`, `vaultbank`, `gridcore`) are engineering fixtures.

### 2.2 Navigation basics

| Area | Route | What you do there |
|------|-------|-------------------|
| Get Started | `/get-started` | ALE baseline, company profile, orientation |
| Integrity Hub | `/integrity` | View ALE exposure, maturity, threat posture |
| Evidence Vault | `/evidence` | Open locked WORM audit evidence |
| Cockpit | `/cockpit` | View workforce agent activity |
| Board Report | `/board-report` | Executive readiness summary |
| Documentation | `/docs` | Level 1 manuals and curated training |
| Audit exports | `/exports` | Download tenant CSV/PDF |
| Audit trail | `/reports/audit-trail` | Forensic audit trail reports |
| Support | `/dashboard/support` | Tenant support requests |

Nav badges **PILOT** / **PREVIEW** mark unfinished surfaces. See [pilot vs preview](./pilot-vs-preview.md).

![Integrity Hub](/docs/training/assets/level-1-04-integrity-hub-ale.png)

### 2.3 Tenant workspace setup

**Design-partner path**

1. Confirm the host shows your assigned slug.
2. Complete ALE + company gates on `/get-started`.
3. Do not switch into seed demo tenants.

**Internal training path (classroom only)**

1. Use the **tenant switcher** when an Ironframe trainer says so.
2. Select a seed profile only in sandbox labs.
3. Confirm data changes when you switch — that proves **tenant isolation**.

> **Quick tip:** Never share screenshots that show another tenant's ID or exposure values.

**Classroom lab (instructors only):** [Tenant Switching](../training/level-1/11-tenant-switching-labs.md)

---

## 3. Core Tasks (GRC workflow)

### 3.1 Identify — Threats and exposure

1. Go to `/integrity`.
2. Review baseline cards (cents inside the system; dollars in the UI).
3. Note **critical threat count** and open risks.
4. Open **Threat Pipeline** / **Active Risks** from the home dashboard.

**Seed baselines (cents, training only):** Medshield `1110000000` · Vaultbank `590000000` · Gridcore `470000000` — partners use the ALE they saved on Get Started.

### 3.2 Assess — Risk scoring and frameworks

1. Review framework readiness on `/board-report`.
2. Map controls in your in-tenant GRC views (ask delivery if a matrix is not enabled yet).
3. Use the right-panel **Live Audit Ledger Stream** to follow events.

### 3.3 Mitigate — Remediation and controls

1. Open a threat card from **Active Risks**.
2. Add fix notes and assign an owner.
3. Track **Sustainability Pulse** (kWh, liters) on the right panel — physical units only.

### 3.4 Monitor — Continuous compliance

1. Visit `/evidence` for WORM-locked evidence.
2. Run `/reports/audit-trail` for exportable audit history.
3. Optional: read briefings at `/governance-frame` (separate from this `/docs` plane).

### 3.5 Export audit deliverables

1. Confirm you are on your design-partner workspace (not Global Command).
2. Open **`/exports`** (old `/dashboard/exports` links still work).
3. Download **CSV** or **PDF** for your tenant.
4. Save exports with a timestamp and tenant name for the auditor.

Detail: [Audit exports](./audit-exports.md).

![Evidence Vault](/docs/training/assets/level-1-05-evidence-vault.png)

---

## 4. Advanced Features

| Feature | Route | Who uses it |
|---------|-------|-------------|
| Trust Center | `/trust` | Partners — procurement materials |
| Governance Frame | `/governance-frame` | Optional briefings reader |
| Admin onboarding | `/admin/onboarding` | **Ironframe GLOBAL_ADMIN only** |
| Sales portal | `/sales-agent-portal` | **Ironframe sales ops only** |
| Approvals queue | `/dashboard/admin/approvals` | **Ironframe GLOBAL_ADMIN only** |

Partners should ignore admin and sales rows. Send provisioning needs to **delivery@ironframegrc.com**.

**Technical depth (IT admins, not Day-1 partners):** [Architecture](../technical/architecture-and-api.md) · [Deployment](../technical/deployment-and-ops.md)

---

## 5. Troubleshooting

| Symptom | Likely fix |
|---------|------------|
| Billing hold / PENDING | Complete Path B Stripe Checkout; refresh; email delivery if still PENDING after payment |
| Export scope banner | Save ALE + company on `/get-started` |
| PILOT vendor CSV disabled | Expected — use `/exports` for live analyst files |
| Docs / training sealed | Billing must be ACTIVE |

**Support:** delivery@ironframegrc.com with tenant slug, time, and browser.

---

## Related

- [Design Partner Operator Packet](./design-partner-operator-packet.md)
- [Quick-Start](./quickstart.md)
- [Get Started workspace setup](./get-started-workspace-setup.md)
- [Dashboard guide](./dashboard-guide.md)
- [Glossary](./glossary.md)
- [Partner training index](../training/LEVEL1-PARTNER-INDEX.md)
