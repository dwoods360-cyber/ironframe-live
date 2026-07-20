# Level 1 Training Index — Student Track (Ironframe Core)

**Audience:** Classroom students and internal trainers  
**Reading level:** 11th grade · **Release:** `v0.1.0-ga-epic17`  
**Scope:** Operating the **Ironframe Core** SaaS app only

**Student section home:** [training/student/README.md](./student/README.md) — every Core handbook for this track lives there.

Design partners use the curated [LEVEL1-PARTNER-INDEX](./LEVEL1-PARTNER-INDEX.md) and `docs/user-manuals/` instead.  
Ops / GTM (Ops Hub, Approvals, Ironleads, LIVE sales assist) is **out of scope** for this track.

Work the **required** chapters in order. Each chapter is a short teach-and-do lab. Keep a simple journal: route · what you saw · time.

---

## Before you start

1. Get student credentials from your trainer.
2. Use the classroom host (often `http://127.0.0.1:3000` unless your trainer gives another URL).
3. Read [student quick-start](./student/manuals/quickstart.md) and [pilot vs preview](./student/manuals/pilot-vs-preview.md).
4. Skim the [Core glossary](./student/manuals/glossary.md).

---

## Required chapters — Ironframe Core

Open each chapter from the path below. Use the primary route in the live app.

| # | Chapter | Path | Route |
|---|---------|------|-------|
| 1 | GRC Foundations and Command Deck | [01-grc-foundations](/docs/training/level-1/01-grc-foundations) | `/integrity` |
| 2 | Authentication and Tenant Access | [02-auth-tenant-access](/docs/training/level-1/02-auth-tenant-access) | `/login` |
| 3 | Dashboard Navigation | [03-dashboard-navigation](/docs/training/level-1/03-dashboard-navigation) | `/` |
| 4 | Integrity Hub and ALE | [04-integrity-hub-ale](/docs/training/level-1/04-integrity-hub-ale) | `/integrity` |
| 5 | Evidence Vault and WORM | [05-evidence-vault](/docs/training/level-1/05-evidence-vault) | `/evidence` |
| 6 | Cockpit Viewport | [06-cockpit-agent-viewport](/docs/training/level-1/06-cockpit-agent-viewport) | `/cockpit` |
| 7 | Board Report Readiness | [07-board-report-readiness](/docs/training/level-1/07-board-report-readiness) | `/board-report` |
| 8 | Docs Hub Handbook | [09-docs-hub-handbook](/docs/training/level-1/09-docs-hub-handbook) | `/docs` |
| 9 | Trust Center | [10-trust-center-procurement](/docs/training/level-1/10-trust-center-procurement) | `/trust` |
| 10 | Tenant Switching Labs | [11-tenant-switching-labs](/docs/training/level-1/11-tenant-switching-labs) | `/integrity` |
| 11 | Student Certification | [12-student-certification](/docs/training/level-1/12-student-certification) | `/docs` |
| 12 | Clear Lab Notes | [13-clear-messaging-for-operators](/docs/training/level-1/13-clear-messaging-for-operators) | `/docs` |

Finish certification with chapter 12 (file `12-student-certification`). Use chapter 13 any time notes feel fuzzy.

---

## Optional chapter (not Core certification)

| Chapter | Path | Route | Why optional |
|---------|------|-------|----------------|
| Governance Frame Reader | [08-governance-frame-reader](/docs/training/level-1/08-governance-frame-reader) | `/governance-frame` | Optional UI peek only — **not** Core cert · **not** Path D GFP |

---

## Student section manuals (11th grade)

These handbooks support the labs. They live under **`docs/training/student/`** so Core learning stays in the student section.

| Manual | Path |
|--------|------|
| Student section home | [student/README.md](./student/README.md) |
| Quick-start | [student/manuals/quickstart.md](./student/manuals/quickstart.md) |
| Core routes map | [student/manuals/core-routes.md](./student/manuals/core-routes.md) |
| Dashboard & Core features | [student/manuals/dashboard-guide.md](./student/manuals/dashboard-guide.md) |
| Pilot vs preview | [student/manuals/pilot-vs-preview.md](./student/manuals/pilot-vs-preview.md) |
| Audit exports | [student/manuals/audit-exports.md](./student/manuals/audit-exports.md) |
| Glossary | [student/manuals/glossary.md](./student/manuals/glossary.md) |
| UI lab checklist | [student/manuals/ui-lab-checklist.md](./student/manuals/ui-lab-checklist.md) |

---

## Screenshots

Chapters reference PNG files under `/docs/training/assets/`.  
Trainers can refresh captures with `npm run training:screenshots` from the repo root.

---

## Out of scope

- Ops Hub, Operator library, Ironleads, SalesTeam, Approvals DISPATCH  
- Design-partner GTM docs under `docs/sales/`  
- Design-partner provision (`/admin/onboarding`) as a student requirement  
- Level 2 practitioner / deployment manuals  

---

## After you certify

1. [Jr. GRC Analyst](./analyst/ANALYST-INDEX.md) — Core practicum  
2. [Platform Practitioner](./practitioner-core/PRACTITIONER-CORE-INDEX.md) — curated Level 2  
3. [Governance Frame Path D](./governance-frame/README.md) — Reader → Writer → Verifier (**GFP**)  
4. [Ops / GTM](./ops-gtm/OPS-GTM-INDEX.md) — only if your trainer assigns internal ops  

Optional Core enrichment only (not Path D): [08-governance-frame-reader](./level-1/08-governance-frame-reader.md).

source-file: config/training-corpus-manifest.json
