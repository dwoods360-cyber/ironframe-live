# Ironframe Documentation Hub

> **Live reader:** open **`/docs`** in Core (hub index = `/docs/README`). `/docs/hub` redirects there.  
> **Canonical index:** [README.md](README.md) — v0.1.0-ga-epic17 documentation center (Level 1 + Level 2).  
> This `hub.md` file is a **legacy filesystem registry** (HTML chapter portals + export links) — not a separate documentation app.

Central file-system registry for the Ironframe GRC documentation architecture. This index maps Documentation Hub chapters (Track 1 classroom HTML portals, Track 2 practitioner specifications), compliance export endpoints, and legacy markdown manuals.

**Product:** Ironframe GRC — multi-tenant governance, risk, and compliance platform with a 19-agent autonomous workforce, BigInt financial integrity, and zero-trust ingestion.

**Version baseline:** v0.1.0-ga-epic17 (June 2026)  
**Stack:** Next.js 15 · Supabase · Prisma · Vercel · LangGraph.js

---

## Constitutional invariants (deployment gate)

These labels and values are verified against the live Command Center UI and must not drift in documentation or collateral.

### Verbatim screen labels

| Element | Exact label | Location |
|---------|-------------|----------|
| Agent monitor | **AGENT STATUS PULSE** | Top quadrant of the **Left Pane** (not full-height stretch) |
| Primary nav tab | **AUDIT TRAIL** | Header navigation strip |
| Primary nav tab | **INTEGRITY HUB** | Header navigation strip |
| Primary nav tab | **BOARD REPORT** | Header navigation strip |
| Primary nav tab | **OP SUPPORT** | Header navigation strip |
| Primary nav tab | **🚨 DMZ QUARANTINE** | Header navigation strip |
| Emergency control | **FREEZE COMMAND POST** | Top sub-header toolline |
| Ledger export | **Export Tabular Ledger Data (CSV)** | Inside **CYBER INSURANCE OPTIMIZATION** card (`data-testid="export-tabular-ledger-csv"`) |

### Financial arithmetic integrity (whole-integer cents)

| Tenant | Baseline (cents) | USD reference |
|--------|------------------|---------------|
| Medshield Health | `1110000000` | $11.1M |
| Vaultbank NA | `590000000` | $5.9M |
| Gridcore Infrastructure | `470000000` | $4.7M |

Source: `prisma/seed.ts`, `docs/TAS.md`, `src/services/irontrust/mathEngine.ts`. No JavaScript float or decimal types on monetary paths.

### Sustainability ingress (Ironbloom / Agent 17)

The **Ironbloom** agent throws runtime exceptions when a payload contains **monetary-only** values. Valid physical indicators are exclusively:

- **kWh** (kilowatt-hours)
- **L** (liters)
- **km** (kilometers)

Rejection codes: `PHYSICAL_UNIT_REQUIRED` (HTTP 400), `CRITICAL_INGESTION_FAILURE` (HTTP 422). Source: `lib/sustainability/constants.ts`, `app/api/sustainability/ironbloom/route.ts`.

---

## Documentation Hub — four-chapter architecture

Interactive HTML chapters are stored on disk under `docs/` (product, support, technical, and training trees).

### 🎓 Track 1 — Student Training Portals (Classroom Sandbox HTML)

| Chapter | Sidebar label | Filesystem path |
|---------|---------------|-----------------|
| 1 | Product Core & Monopolies | `docs/product/vision_and_overview_track1.html` |
| 2 | Automated Self-Healing Labs | `docs/support/self_healing_guide_track1.html` |
| 3 | Visual Data Ingress Systems | `docs/technical/integration_basics_track1.html` |
| Index | High School Index Portal | `docs/training/high-school/index.html` |

### 💼 Track 2 — GRC Practitioner Specifications (Print / Java contracts)

| Chapter | Sidebar label | Filesystem path | Type |
|---------|---------------|-----------------|------|
| 1 | Enterprise Business Specifications | `docs/product/business_plan_spec_track2.html` | HTML Module |
| 2 | Multi-Agent Triage Runbooks | `docs/support/operations_triage_spec.html` | HTML Module |
| Manual | Track 2: GRC Practitioner Operational Guide (CSV Infrastructure) | `docs/support/user_guide_manual.html` | HTML Module |
| 3 | BigInt Data Schema Contracts | `docs/technical/data_dictionary_and_api_track2.html` | HTML Module |
| Index | Professional Index Portal | `docs/training/professional/index.html` | HTML Module |

### 📥 Compliance exports (bundled artifacts)

| Resource | Filesystem / artifact | Description |
|----------|----------------------|-------------|
| UX/Feature Test Protocol (.docx) | `docs/Ironframe-UI-UX-Feature-Test-Protocol.docx` | MS Word compliance specification |
| Test manifest JSON | export manifest (EXPORT-001) | Selectors, baseline cents, chapter paths |
| Feature test matrix (.csv) | `docs/Ironframe-UI-UX-Feature-Test-Matrix.csv` | UI/UX verification matrix |

### Repository integration (engineering reference)

| Component | Source path | Role |
|-----------|-------------|------|
| Docs sidebar | `app/docs/[[...slug]]/DocsSidebar.tsx` | Grouped Track 1 / Track 2 navigation |
| Docs viewer | `app/docs/[[...slug]]/page.tsx` | Markdown renderer |
| Hub asset route | `app/api/docs/hub-asset/[[...path]]/route.ts` | Serves whitelisted HTML from `docs/` |

---

## Stakeholders

| Document | Purpose |
|----------|---------|
| [Product Vision](./stakeholders/product-vision.md) | Purpose, goals, KPIs |
| [Product Roadmap](./stakeholders/product-roadmap.md) | Milestones and upcoming features |
| [Business Plan](./stakeholders/business-plan.md) | Market, revenue model, financial outlook |
| [Technical Requirements (TRD)](./stakeholders/technical-requirements.md) | Architecture, infrastructure, security |

## External (investors, partners, press)

| Document | Purpose |
|----------|---------|
| [Elevator Pitch](./external/elevator-pitch.md) | 60-second value proposition |
| [Product Overview](./external/product-overview.md) | Features, benefits, audience |
| [Marketing One-Pager](./external/marketing-one-pager.md) | Single-page collateral summary |

## End-users

| Document | Purpose |
|----------|---------|
| [Design Partner Operator Packet](./user-manuals/design-partner-operator-packet.md) | Canonical partner handoff — invite → Path B → cockpit → `/exports` |
| [Partner training index](./training/LEVEL1-PARTNER-INDEX.md) | Curated Level 1 chapters (excludes classroom seed labs) |
| [User Guide](./user-manuals/user-guide.md) | Command Center, tenants, workflows (canonical) |
| [Get Started setup](./user-manuals/get-started-workspace-setup.md) | ALE baseline + GRC company gates |
| [Audit exports](./user-manuals/audit-exports.md) | Analyst CSV/PDF at `/exports` |
| [Pilot vs preview](./user-manuals/pilot-vs-preview.md) | PILOT/PREVIEW badge policy |
| [Release Notes](./end-users/release-notes.md) | Recent features and fixes |
| [FAQ](./end-users/faq.md) | Common questions |
| [Onboarding](./end-users/onboarding.md) | First-session checklist |

## Support

| Document | Purpose |
|----------|---------|
| [Support Guide](./support/support-guide.md) | Triage, escalation, tenant isolation |
| [Knowledge Base](./support/knowledge-base.md) | Article index and deep links |
| [Nightly Cron Runbook](./operations-support/nightly-cron-runbook.md) | Windows doc engine vs API narrate — ops verification |
| [Error Messages & Solutions](./support/error-messages.md) | Known errors and remediation |

## Sales

| Document | Purpose |
|----------|---------|
| **In-app Operator library** | `/dashboard/operations/library` — directory of GTM playbooks + tools (auth: Ops Hub) |
| [Pre-outreach dry-run (run order)](./sales/design-partner-pre-outreach-run-order.md) | R1–R8 gate before first partner DISPATCH |
| [GTM operator glossary](./sales/design-partner-gtm-operator-glossary.md) | SUSPECT → Path B, DISPATCH, LIVE sidecar, message locks |
| [Workflow review protocol](./sales/design-partner-workflow-review-protocol.md) | 15-min peer-to-peer diligence talk track |
| Printable talk track | `/operator/workflow-review-protocol.html` |
| LIVE call assist (tool) | `/dashboard/operations/workflow-review` — mic STT, recap, calendar push |
| [Operator launch checklist](./sales/design-partner-operator-launch-checklist.md) | Batch send + close/provision cadence after dry-run GO |
| [Sales Enablement](./sales/sales-enablement.md) | Demo script, talk tracks, objections |
| [Competitive Analysis](./sales/competitive-analysis.md) | Differentiation vs legacy GRC |
| [Pricing & Packaging](./sales/pricing-and-packaging.md) | Plans and packaging framework |
| [Message Constitution](./sales-enablement/message-constitution.md) | Beachhead drafting authority — code path, not SalesTeam portal |
| [Pricing & Packaging (board ingest)](./sales-enablement/pricing-and-packaging.md) | Path B + planned GA mirrors for IronBoard federation |
| [Competitive pricing map](./sales-enablement/competitive-pricing-map.md) | Peer ACV bands (internal) |
| [Design-partner workforce briefing](./sales/design-partner-workforce-briefing.md) | RACI + message lock for board + perimeter workers |
| [Recruitment runbook](./sales/design-partner-recruitment.md) | How to recruit 3–5 Path B co-builders |
| Product knowledge sync | `npm run knowledge:check` · `npm run knowledge:sync` (diff + mirror apply + blast radius) |
| Product knowledge gates | Local: `npm run install-hooks` (path-filtered pre-commit hard block) · CI: `knowledge:check` + `test:product-knowledge` · Ops Hub: **Sync product knowledge** button (`/dashboard/operations`) |

## Marketing

| Document | Purpose |
|----------|---------|
| [Marketing Plan](./marketing/marketing-plan.md) | Channels, campaigns, positioning |
| [Content Calendar](./marketing/content-calendar.md) | Editorial schedule template |
| [Social Media Guidelines](./marketing/social-media-guidelines.md) | Tone, voice, compliance |

## Social media

| Document | Purpose |
|----------|---------|
| [Style Guide](./social/style-guide.md) | Branding, tone, visual rules |
| [Content Calendar](./social/content-calendar.md) | Social posting rhythm |
| [Metrics & Analytics](./social/metrics-analytics.md) | KPIs and tooling |

## Technical (all audiences)

| Document | Purpose |
|----------|---------|
| [API Documentation](./technical/api-documentation.md) | Routes, auth, data contracts |
| [Security & Compliance](./technical/security-and-compliance.md) | Controls, certifications, data handling |
| [Changelog](./technical/changelog.md) | Version history |

## Engineering & operations

| Document | Purpose |
|----------|---------|
| [TAS.md](./TAS.md) | Technical Architecture Specification (authoritative) |
| [GA Open Roadmap](./GA_OPEN_ROADMAP.md) | GA release priorities |
| [Battle Lab Roadmap](./BATTLE_LAB_ROADMAP.md) | Battle lab feature trajectory |
| [Testing](./testing.md) | Test matrices and CI gates |
| [Completed Modules](./completed-modules.md) | Shipped module inventory |
| [Competitive Landscape](./competitive-landscape.md) | Market gaps and build mandate |
| [Tier A Vercel Staging Checklist](./TIER_A_VERCEL_STAGING_CHECKLIST.md) | Staging verification checklist |
| [Forensic Integrity Report](./FORENSIC_INTEGRITY_REPORT.md) | Integrity audit findings |
| [Deep Review 30-Day Diff](./DEEP_REVIEW_30_DAY_DIFF.md) | 30-day change analysis |

## Release evidence

| Document | Purpose |
|----------|---------|
| [Release Evidence 2026-06-02](./RELEASE_EVIDENCE_2026-06-02.md) | GA evidence pack (June 2026) |
| [Release Evidence 2026-05-28](./RELEASE_EVIDENCE_2026-05-28.md) | Pre-GA evidence pack |

## UI schematics

| Document | Purpose |
|----------|---------|
| [UI Schematic v1](./ui-schematic-v1.md) | Early UI wireframe reference |
| [UI Schematic Final](./ui-schematic-final.md) | Final UI schematic |

## Audit & blast radius

| Document | Purpose |
|----------|---------|
| [Audit: Threat Templates Blast Radius](./audit-threat-templates-blast-radius.md) | Threat template change impact |
| [Audit: Irontrust Financials Blast Radius](./audit-irontrust-financials-blast-radius.md) | Financial module change impact |

## PR & epic notes

| Document | Purpose |
|----------|---------|
| [Epic 12 WORM Ops](./pr/EPIC12_WORM_OPS.md) | WORM storage operations notes |
| [Epic 12 PR Body](./pr/EPIC12_PR_BODY.md) | Epic 12 pull request template |
| [Epic 16 PR Body](./pr/EPIC16_PR_BODY.md) | Epic 16 pull request template |

## 🧪 Quality Assurance & Platform Testing

* **Enterprise Testing Suite:**
  * [Core System Protocol](./qa/manual-testing-protocol.md) — Technical, step-by-step security and context resilience verification for engineers.
* **High School Classroom Track:**
  * [Student Sandbox Lab](./qa/student-testing-protocol.md) — Simplified, plain-English manual testing walkthrough optimized for 11th & 12th-grade technical labs.
  * [GRC Operations Glossary & Screen Guide](./qa/complete-feature-glossary.md) — Interactive reference for dashboard controls, locations, and lab operations.

---

*Last updated: June 2026. Owner: Product / Platform Engineering.*
