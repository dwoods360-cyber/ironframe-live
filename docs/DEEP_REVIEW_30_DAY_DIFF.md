# Deep Review: Code State vs Last 30 Days

**Comparison baseline:** `d3791e3` (2026-02-12 — initial clean commit)  
**Current state:** `HEAD` (fix/grc-phi-masking branch, 2026-03-08)  
**Scope:** 285 files changed, ~45.6k insertions, ~5.4k deletions.

---

## 1. Security & GRC

| Difference | Before (30 days ago) | Current |
|------------|----------------------|---------|
| **Tenant isolation (dashboard)** | GET /api/dashboard returned all companies/risks | Requires `x-tenant-id`; returns 401 if missing; filters companies and active_risks by `tenantId` |
| **Company–Tenant relation** | No tenant FK on Company | `Company.tenantId` → `Tenant` with `onDelete: Cascade`; migration + seed assign companies to tenants |
| **PII/PHI in PDF export** | ThreatInvestigationPanel PDF used raw report/notes | Report and notes run through `maskSensitiveData()` before export; UI state unchanged |
| **maskSensitiveData** | Existed in `retentionPolicy.ts` (SSN, email) | Same utility; now used in PDF export path and covered by unit tests |
| **RLS / Supabase** | Isolation tests for Failed_Jobs (Supabase) | Same; plus dashboard API and Prisma tenant scoping |

---

## 2. API & Backend

| Difference | Before | Current |
|------------|--------|---------|
| **Dashboard route** | Single GET, no tenant filter | `app/api/dashboard/route.ts`: tenant from header, 401 if missing, Prisma filter by `tenantId`; BigInt serialization for company in JSON |
| **New/updated routes** | — | `/api/alerts/dispatch`, `/api/audit/export`, `/api/evidence/autofetch`, `/api/ingest`, `/api/investigate`, `/api/regulations/sync`, `/api/remediate`, tenant-scoped evidence, health, test-email, threats |
| **Purge / simulation** | — | `purgeSimulation`, simulationActions, upload-to-dmz, quarantine |

---

## 3. Data & Schema (Prisma)

| Difference | Before | Current |
|------------|--------|---------|
| **Company** | No tenant link | `tenantId String @db.Uuid`, `tenant Tenant @relation(..., onDelete: Cascade)` |
| **Tenant** | — | `companies Company[]` |
| **ThreatEvent** | — | `tenantCompanyId BigInt?` (retained for RLS policy) |
| **IronwatchLog** | Not in schema | `IronwatchLog` model with `@@map("ironwatch_log")` (id, event_type, actor_id, detail, severity, created_at) |
| **Migrations** | — | company_tenant_id, threat_financial_risk_cents, is_simulation, etc. |
| **Seed** | — | Tenants with fixed UUIDs; companies created with `tenantId`; vendor tenant assignment |

---

## 4. UI & Components

| Difference | Before | Current |
|------------|--------|---------|
| **StrategicIntel** | Simpler or different layout | Large sidebar: Control Room (wired to stores + Link), Industry Profile (5-sector), Risk Exposure (Option B ALE, pipeline-driven), Top Sector Threats, Agent grid, terminal input, TTL, Sentinel Sweep; single layout (no Dark Start branch) |
| **Main page (dashboard)** | Plain fetch for /api/dashboard | Uses `tenantFetch` and `x-tenant-id` (or default medshield); error handling for 401 |
| **ThreatInvestigationPanel** | PDF from raw fullReportText / fullNotesText | PDF built from `reportForPdf` and `notesForPdf` (maskSensitiveData applied); import from `retentionPolicy` |
| **ThreatDetailDrawer** | — | Uses ThreatInvestigationPanel; GRC action chips (Save, Email, PDF) |
| **Other** | — | AuditIntelligence, ThreatPipeline, Header, DashboardWithDrawer, GlobalHealthSummaryCard, toasts, AlertBanners, TenantProvider, DebugPanel, many role/vendor/report pages |

---

## 5. State & Stores

| Difference | Before | Current |
|------------|--------|---------|
| **riskStore** | — | pipelineThreats, acceptedThreatImpacts, selectedIndustry, dashboard liabilities, riskOffset, etc. |
| **kimbotStore / grcBotStore** | — | enabled, setEnabled, companyCount, resetSimulationCounters, stop |
| **systemConfigStore** | — | expertModeEnabled, setExpertModeEnabled |
| **agentStore, regulatoryStore, evidenceStore, etc.** | — | Multiple stores for alerts, billing, permissions, remediation, reports |

---

## 6. Tests

| Difference | Before | Current |
|------------|--------|---------|
| **Dashboard tenant isolation** | — | `tests/integration/dashboard.test.ts`: no-tenant → 401, Vaultbank context → only Vaultbank data; Prisma mocked |
| **PII masking for export** | — | `tests/unit/pdfExport.test.ts`: maskSensitiveData replaces SSN/email in payload; 4 cases |
| **E2E / Playwright** | — | dashboard.spec, stage1-validation, vendors-audit, supabase-connection |
| **Vitest** | — | orchestration, specialists, live-fire, isolation, ALE engine; vitest.config + setup |
| **Stryker** | — | mutation config |

---

## 7. DevOps, Config & Docs

| Difference | Before | Current |
|------------|--------|---------|
| **Branch** | main (or prior) | fix/grc-phi-masking (current work) |
| **CI / GitHub** | — | ci.yml, deploy.yml, playwright.yml; Supabase secrets, build hardening |
| **Docker / GCP** | — | Dockerfile, gcp-deploy.yaml |
| **Docs** | — | TAS.md, competitive-landscape, completed-modules, testing, ui-schematic, ITERATION_LOG, backlog_review, CHANGES, COMPONENTS, validation reports |
| **Prisma** | — | Dual schema (main + prisma-dmz); scripts for verify-db, add-companies-tenant-id.sql |

---

## 8. Recent Sprint (March 4 → March 8)

| Change | File(s) |
|--------|--------|
| StrategicIntel restored and stabilized | `app/components/StrategicIntel.tsx` (layout, Control Room, Industry Profile, Risk Exposure, threats, agents, terminal) |
| Control Room wired to routing and stores | Link, useKimbotStore/useGrcBotStore/useSystemConfigStore, toggleKimbot/Grcbot/Expert, handlePurgeSimulation |
| Risk Exposure Option B ALE | pipelineThreats → totalRiskMillions, currentRiskDisplay, potentialImpactDisplay; industry/grc baselines; bar widths |
| Dashboard tenant isolation | `app/api/dashboard/route.ts` (x-tenant-id, 401, filter); `app/page.tsx` (tenantFetch, default tenant) |
| Company.tenantId + Tenant cascade | `prisma/schema.prisma`, migration, seed, add-companies-tenant-id.sql |
| ironwatch_log + tenantCompanyId preserved | IronwatchLog model; ThreatEvent.tenantCompanyId BigInt? |
| PII/PHI masking in PDF | `components/ThreatInvestigationPanel.tsx` (maskSensitiveData on reportForPdf, notesForPdf) |
| Integration test: dashboard isolation | `tests/integration/dashboard.test.ts` |
| Unit test: PDF export masking | `tests/unit/pdfExport.test.ts` |
| Ops report route | `app/reports/ops/page.tsx` |

---

## 9. Summary List (Differences)

1. **Security:** Tenant-scoped dashboard API; Company→Tenant with cascade; PII/PHI masking on PDF export; no raw SSN/email in exported PDFs.
2. **Schema:** Company.tenantId, Tenant.companies, ThreatEvent.tenantCompanyId, IronwatchLog; migrations and seed aligned.
3. **API:** Dashboard requires x-tenant-id and filters by tenant; multiple new routes (alerts, audit, evidence, ingest, investigate, regulations, etc.).
4. **UI:** StrategicIntel is the main sidebar (Control Room, Industry Profile, Risk Exposure, threats, agents, terminal); main page uses tenantFetch; ThreatInvestigationPanel masks content only for PDF.
5. **State:** riskStore, kimbotStore, grcBotStore, systemConfigStore (and others) drive Control Room and Risk Exposure.
6. **Tests:** Dashboard tenant isolation (401 + isolated access); PII masking in export payload; existing Vitest/Playwright suites.
7. **Docs/ops:** backlog_review, ITERATION_LOG, validation docs, Prisma scripts, CI/CD and Docker.

---

*Generated from git diff d3791e3..HEAD and 6c72895..HEAD.*
