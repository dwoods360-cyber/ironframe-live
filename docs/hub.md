# Ironframe Documentation Hub

Central file-system registry for the Ironframe GRC documentation architecture. This index maps every Documentation Hub chapter (Track 1 classroom HTML portals, Track 2 practitioner specifications), compliance export endpoints, and legacy markdown manuals.

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

### Sustainability ingress (Ironbloom / Agent 18)

The **Ironbloom** agent throws runtime exceptions when a payload contains **monetary-only** values. Valid physical indicators are exclusively:

- **kWh** (kilowatt-hours)
- **L** (liters)
- **km** (kilometers)

Rejection codes: `PHYSICAL_UNIT_REQUIRED` (HTTP 400), `CRITICAL_INGESTION_FAILURE` (HTTP 422). Source: `lib/sustainability/constants.ts`, `app/api/sustainability/ironbloom/route.ts`.

---

## Documentation Hub — four-chapter architecture

Interactive HTML chapters are served at clean `/docs/.../*.html` URLs (rewritten to `/api/docs/hub-asset/...`). Files live on disk under `docs/`.

### 🎓 Track 1 — Student Training Portals (Classroom Sandbox HTML)

| Chapter | Sidebar label | Served URL | Filesystem path |
|---------|---------------|------------|-----------------|
| 1 | Product Core & Monopolies | [/docs/product/vision_and_overview_track1.html](/docs/product/vision_and_overview_track1.html) | `docs/product/vision_and_overview_track1.html` |
| 2 | Automated Self-Healing Labs | [/docs/support/self_healing_guide_track1.html](/docs/support/self_healing_guide_track1.html) | `docs/support/self_healing_guide_track1.html` |
| 3 | Visual Data Ingress Systems | [/docs/technical/integration_basics_track1.html](/docs/technical/integration_basics_track1.html) | `docs/technical/integration_basics_track1.html` |
| Index | High School Index Portal | [/docs/training/high-school/index.html](/docs/training/high-school/index.html) | `docs/training/high-school/index.html` |

### 💼 Track 2 — GRC Practitioner Specifications (Print / Java contracts)

| Chapter | Sidebar label | Served URL | Filesystem path | Type |
|---------|---------------|------------|-----------------|------|
| 1 | Enterprise Business Specifications | [/docs/product/business_plan_spec_track2.html](/docs/product/business_plan_spec_track2.html) | `docs/product/business_plan_spec_track2.html` | HTML Module |
| 2 | Multi-Agent Triage Runbooks | [/docs/support/operations_triage_spec.html](/docs/support/operations_triage_spec.html) | `docs/support/operations_triage_spec.html` | HTML Module |
| Manual | Track 2: GRC Practitioner Operational Guide (CSV Infrastructure) | [/docs/support/user_guide_manual.html](/docs/support/user_guide_manual.html) | `docs/support/user_guide_manual.html` | HTML Module |
| 3 | BigInt Data Schema Contracts | [/docs/technical/data_dictionary_and_api_track2.html](/docs/technical/data_dictionary_and_api_track2.html) | `docs/technical/data_dictionary_and_api_track2.html` | HTML Module |
| Index | Professional Index Portal | [/docs/training/professional/index.html](/docs/training/professional/index.html) | `docs/training/professional/index.html` | HTML Module |

### 📥 Compliance exports (API endpoints)

| Resource | URL | Description |
|----------|-----|-------------|
| UX/Feature Test Protocol (.docx) | [/api/docs/download-protocol](/api/docs/download-protocol) | Streams `docs/Ironframe-UI-UX-Feature-Test-Protocol.docx` |
| Test manifest JSON | [/api/docs/download-protocol?manifest=1](/api/docs/download-protocol?manifest=1) | EXPORT-001 selectors, baseline cents, chapter paths |
| Feature test matrix (.csv) | [/api/docs/download-matrix](/api/docs/download-matrix) | Streams `docs/Ironframe-UI-UX-Feature-Test-Matrix.csv` |
| Hub HTML asset (direct) | `/api/docs/hub-asset/{path}` | Internal route backing `/docs/{product\|support\|technical\|training}/...` rewrites |

### App integration

| Component | Path | Role |
|-----------|------|------|
| Docs sidebar | `app/docs/[[...slug]]/DocsSidebar.tsx` | Grouped Track 1 / Track 2 / Compliance Exports navigation |
| Docs viewer | `app/docs/[[...slug]]/page.tsx` | Markdown hub pages (this file at `/docs/hub`) |
| Hub asset route | `app/api/docs/hub-asset/[[...path]]/route.ts` | Serves whitelisted HTML from `docs/` |
| URL rewrites | `next.config.ts` | Maps `/docs/product/*.html` → hub-asset API |

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
| [User Guide](./end-users/user-guide.md) | Command Center, tenants, workflows |
| [Release Notes](./end-users/release-notes.md) | Recent features and fixes |
| [FAQ](./end-users/faq.md) | Common questions |
| [Onboarding](./end-users/onboarding.md) | First-session checklist |

## Support

| Document | Purpose |
|----------|---------|
| [Support Guide](./support/support-guide.md) | Triage, escalation, tenant isolation |
| [Knowledge Base](./support/knowledge-base.md) | Article index and deep links |
| [Error Messages & Solutions](./support/error-messages.md) | Known errors and remediation |

## Sales

| Document | Purpose |
|----------|---------|
| [Sales Enablement](./sales/sales-enablement.md) | Demo script, talk tracks, objections |
| [Competitive Analysis](./sales/competitive-analysis.md) | Differentiation vs legacy GRC |
| [Pricing & Packaging](./sales/pricing-and-packaging.md) | Plans and packaging framework |

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
