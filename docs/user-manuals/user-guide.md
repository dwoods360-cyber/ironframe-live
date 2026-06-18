# Ironframe GRC — Complete Beginner User Guide

> **Reading level:** 11th grade · **Audience:** New users with zero prior GRC or Ironframe experience  
> **Canonical path:** `/docs/user-manuals/user-guide` · **Master operator manual**

This guide follows the professional GRC workflow: **identify → assess → mitigate → monitor**. Every step maps to a real route in the Ironframe SaaS application.

---

## 1. Introduction — What is Ironframe?

Ironframe is a **Governance, Risk, and Compliance (GRC)** platform. It helps organizations:

- **Governance** — Set rules and policies (who can do what)
- **Risk** — Measure financial exposure (ALE) and threats
- **Compliance** — Prove controls to auditors with immutable evidence

> **Quick tip:** Think of Ironframe as a command center with three panels: data on the left (22%), your work in the center (48%), and audit logs on the right (30%).

![Command Center layout](/docs/training/assets/level-1-03-dashboard-navigation.png)

**Related reading:** [Glossary](./glossary.md) · [Quick-Start](./quickstart.md) · [Training Index](../training/LEVEL1-STUDENT-INDEX.md)

source-file: docs/TAS.md  
source-file: config/route-manifest.v0.1.0-ga-epic17.json

---

## 2. Getting Started

### 2.1 Account access

1. Receive your **sales-assisted invitation** email (public self-registration may be disabled).
2. Open **Login** at your workspace URL (local dev: sign in via Supabase at `/login`).
3. Complete **MSA/DPA** legal sign-off when prompted at `/legal/accept`.
4. Land on the **Integrity Hub** at `/integrity` after authentication.

> **Quick tip:** Open DevTools → Application → Cookies and confirm `ironframe-tenant` is set after login.

### 2.2 Navigation basics

| Area | Route | What you do there |
|------|-------|-------------------|
| Integrity Hub | `/integrity` | View ALE exposure, maturity score, threat posture |
| Evidence Vault | `/evidence` | Access immutable WORM audit evidence |
| Cockpit | `/cockpit` | View 19-agent workforce coordination |
| Board Report | `/board-report` | Executive readiness summary |
| Documentation | `/docs` | This handbook and training manuals |
| Audit exports | `/dashboard/exports` | Download tenant-scoped CSV/PDF |
| Audit trail | `/reports/audit-trail` | Forensic audit trail reports |
| Support | `/dashboard/support` | Customer service pending drafts |
| Admin approvals | `/dashboard/admin/approvals` | Human-in-the-loop email dispatch |

![Integrity Hub](/docs/training/assets/level-1-04-integrity-hub-ale.png)

### 2.3 Tenant workspace setup

1. Use the **tenant switcher** (building icon, top navigation).
2. Select **Medshield**, **Vaultbank**, or **Gridcore** (your assigned tenant).
3. Confirm data changes when switching — this proves **tenant isolation**.

> **Quick tip:** Never share screenshots that show another tenant's UUID or exposure values.

**Lab:** [Tenant Switching](../training/level-1/11-tenant-switching-labs.md)

---

## 3. Core Tasks (GRC Professional Workflow)

### 3.1 Identify — Threats and exposure

1. Go to `/integrity`.
2. Review **sovereign pool** baseline cards (whole-integer USD cents internally; formatted strings in UI).
3. Note **critical threat count** and active vulnerabilities.
4. Open **Threat Pipeline** / **Active Risks** from the dashboard home.

**Constitutional baselines (cents):** Medshield `1110000000` · Vaultbank `590000000` · Gridcore `470000000`

### 3.2 Assess — Risk scoring and frameworks

1. Review **DORA** and framework readiness percentages on `/board-report`.
2. Map controls using the [Feature Glossary](../qa/complete-feature-glossary.md).
3. Use the right-panel **Live Audit Ledger Stream** to trace events.

### 3.3 Mitigate — Remediation and controls

1. Open a threat card from **Active Risks**.
2. Add remediation notes and assign ownership.
3. Track **Sustainability Pulse** (kWh, liters) on the right panel — physical units only.

### 3.4 Monitor — Continuous compliance

1. Visit `/evidence` for WORM-locked evidence.
2. Run `/reports/audit-trail` for exportable audit history.
3. Read syndicated briefings at `/governance-frame` (separate from this `/docs` plane).

### 3.5 Export audit deliverables

1. Set tenant scope in the switcher (not Global Command Center).
2. Navigate to `/dashboard/exports`.
3. Download **CSV** or **PDF** for the active tenant.
4. Archive exports with timestamp and tenant UUID for auditor handoff.

![Evidence Vault](/docs/training/assets/level-1-05-evidence-vault.png)

---

## 4. Advanced Features

| Feature | Route | Summary |
|---------|-------|---------|
| Trust Center | `/trust` | Procurement materials, subprocessors, residency |
| Admin onboarding | `/admin/onboarding` | GLOBAL_ADMIN tenant provisioning |
| Sales portal | `/sales-agent-portal` | Grounded B2B pitch workflow |
| Approvals queue | `/dashboard/admin/approvals` | DISPATCH / PURGE human-in-the-loop emails |
| Governance Frame | `/governance-frame` | External briefing reader (not editable here) |
| IronBoard bridge | `:8082` | Agent coordination (read-only telemetry to boardroom) |

**Technical depth:** [Architecture](../technical/architecture-and-api.md) · [Deployment](../technical/deployment-and-ops.md) · [Security](../technical/security-and-compliance.md)

---

## 5. Troubleshooting & FAQs

| Symptom | Fix |
|---------|-----|
| Redirect to `/login` | Session expired — sign in again |
| Redirect to `/unauthorized` | No `user_role_assignments` row — contact admin |
| Blank panels after tenant switch | Wait for refetch; refresh page |
| Exports show "no active tenant" | Select a specific tenant (not Global) |
| `/docs/...` page shows "Compilation Ingress Portal" | Document not yet synced — run documentation pipeline or `npm run docs:seed` |

**More help:** [FAQ](../end-users/faq.md) · [Error Messages](../support/error-messages.md) · [Support Guide](../support/support-guide.md)

---

## 6. Full training manual (63+ pages)

Complete step-by-step chapters with navigation paths and screenshots:

| Track | Index |
|-------|-------|
| Level 1 — Student | [LEVEL1-STUDENT-INDEX](../training/LEVEL1-STUDENT-INDEX.md) |
| Level 2 — Practitioner | [LEVEL2-PRACTITIONER-INDEX](../training/LEVEL2-PRACTITIONER-INDEX.md) |

Sample chapters:

- [Chapter 1 — GRC Foundations](../training/level-1/01-grc-foundations.md)
- [Chapter 4 — Integrity Hub & ALE](../training/level-1/04-integrity-hub-ale.md)
- [Chapter 10 — Approvals HITL](../training/level-2/10-approvals-human-in-loop.md)

---

## 7. Documentation map (verified tree)

| Document | Path |
|----------|------|
| **This guide** | `user-manuals/user-guide.md` |
| Technical Architecture (TAS) | [TAS.md](../TAS.md) |
| Competitive landscape | [competitive-landscape.md](../competitive-landscape.md) |
| Infrastructure & env (ops) | [deployment-and-ops.md](../technical/deployment-and-ops.md) |
| Quick-Start | [quickstart.md](./quickstart.md) |
| Dashboard manual | [dashboard-guide.md](./dashboard-guide.md) |

> **Note:** Legacy references to `/docs/user-guide.md` at repository root redirect here. There is no separate `infrastructure.md` — use `technical/deployment-and-ops.md`.

ref: GET /api/board/shared-context  
source-file: config/training-corpus-manifest.json
