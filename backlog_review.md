# GRC Acceptance Tests — Backlog for Human Review

The following tests were not auto-fixed and need product or environment decisions.

---

## 1. System latency <100ms during 100-company scale test

**Category:** Phase 1 — CLI & Simulation  
**Reason:** Requires executed load (e.g. run grcbot 100, trigger 100-company simulation) and a defined latency metric (e.g. time-to-first-byte for dashboard, or pipeline card render). No automated load or latency assertion exists in-repo.  
**Options:**  
- Add a performance test (e.g. Playwright or k6) that runs grcbot at 100 companies and asserts p95 latency <100ms for a key endpoint or page.  
- Define “system latency” (API? full page? pipeline update?) and add instrumentation, then run manually and record result.

---

## 2. The Gate: $10M+ threats disable 'Ingest' until 50+ char note

**Category:** Phase 2 — GRC Workflow  
**Reason:** Codebase has no explicit “Ingest” button that is disabled for threats ≥$10M until a note of 50+ characters is provided. ThreatDetailDrawer shows risk badge for financialRiskM >= 10 (Critical); ingestion flows go through POST /api/ingest (Irongate) and pipeline “Ingest”/acknowledge in ThreatPipeline. The 50-char gate may be specified for Agent 14 (Irongate) or a future UI control.  
**Options:**  
- Add in ThreatPipeline (or drawer): when acknowledging a threat with financialRiskM >= 10, require a note field length >= 50 before enabling Ingest/Acknowledge.  
- Implement the gate in Irongate/ingest API and document behavior; then add a small E2E or unit test.

---

## 3. Tenant Isolation: Ingest data in Medshield, Vaultbank dashboard empty

**Category:** Phase 3 — Security & Multi-Tenancy (CRITICAL)  
**Reason:** GET /api/dashboard returns all companies and all risks; it does not filter by x-tenant-id or tenant context. The main dashboard is an aggregate view. Tenant-specific routes exist (e.g. /medshield, /vaultbank, /api/medshield/assets). Cross-tenant fetch is correctly blocked (403) in the Dev Tenant Switcher test.  
**Options:**  
- **Product decision:** Should the main dashboard be tenant-scoped when a tenant is selected (e.g. from TenantProvider/Header)? If yes, add tenant filter to /api/dashboard (and optionally to dashboard page) so that when “Vaultbank” is selected, only Vaultbank data is shown.  
- Alternatively, document that the home dashboard is aggregate and that tenant isolation is enforced only on tenant-specific routes and APIs (e.g. /api/medshield/assets, cross-tenant fetch 403).

---

## 4. PII/PHI masking in PDF exports (follow-up)

**Category:** Phase 3 — Security & Multi-Tenancy  
**Note:** maskSensitiveData() exists and is used in the IrontechDashboard log stream. The ThreatInvestigationPanel PDF export (html2pdf) does not run report or notes through maskSensitiveData before export. If AI reports or analyst notes can contain SSN/patient data, apply maskSensitiveData to the text used for PDF content before calling html2pdf.

---

## 5. Build failure (EPERM) — environment

**Category:** Phase 5 — Build  
**Reason:** `npm run build` failed with EPERM during Prisma generate (rename of query_engine-windows.dll.node). Typically caused by another process (e.g. `next dev`) holding the file.  
**Action:** Stop all Node processes (e.g. close dev server, kill node.exe), then run `npm run build` again. No code change required unless the lock persists.

**Re-run (2026-03-02):** After stopping Node and running `npx prisma generate` (main + DMZ), `npm run build` completed successfully. Two TypeScript fixes were applied: AuditIntelligence.tsx (ListItem client entry type), page.tsx (policies map parameter type). Build now **PASS**.

---

## 6. E2E Dashboard spec outdated

**Category:** Phase 4 / E2E  
**Reason:** `npx playwright test tests/e2e` failed: test expects `h1` to contain "Sentinel Dashboard" and "Sovereign Orchestration Monitoring"; current app shows "EMERGENCY CLICK TEST".  
**Action:** Update tests/e2e/dashboard.spec.ts to match current dashboard title/copy, or document as product change and adjust expectations.
