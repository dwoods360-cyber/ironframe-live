/docs/TAS.md — Technical Architecture Specification
Project: Ironframe
Version: 2.0.1 (Sovereign Build State)
Last Updated: 2026-04-16
Authority: Supreme Architectural Authority (Layers 2 & 5)
This document serves as the constitutional foundation for the Ironframe platform. Any deviation from this specification requires a formal TAS Amendment Proposal. Silent structural changes are strictly forbidden.
1. Core Architectural Philosophy
Ironframe is engineered for structured speed under a CONTROL-FIRST paradigm. Our core philosophy rests on three pillars:
Modular Execution: Strict separation of concerns enforced via a specialized agent workforce.
Zero-Trust Data Ingestion: No external payload enters the internal message bus or database without cryptographic and structural sanitization.
Persistent LangGraph State Memory: Human-in-the-loop observability and self-healing capabilities powered by immutable state checkpoints.
The Sovereign Stack:
Framework: Next.js 15.1.6 with Turbopack
Database & Auth: Supabase (PostgreSQL)
ORM: Prisma
Styling: Tailwind CSS
AI Orchestration: Vercel AI SDK + LangGraph.js
IDE: Cursor (Exclusive)
Testing: Playwright (E2E) + Vitest (Unit/Integration)
Infrastructure: Google Cloud Platform (via GitHub Actions CI/CD)
2. The 19-Agent Workforce
The Ironframe AI system operates via a strict 19-agent roster. No agent may expand beyond its defined Core Directive. LangGraph state memory ensures persistent checkpoints and prevents cross-tenant memory bleed.
Ironcore — Orchestrator & Routing. The central nervous system directing traffic to specialized agents.
Ironwave — Live Telemetry Monitoring. Ingests and standardizes real-time system health and performance metrics.
Irontrust — Scoring Engine. Executes ALE Math (Constitutionally Frozen). Modifying this math requires 100% unit test coverage and snapshot comparison.
Ironsight — Tactical Sentinel. High-Fidelity Active Risk Scanner for immediate threat vector identification.
Ironscribe — Deep-Doc Worker. Document parsing, OCR, and unstructured data extraction.
Ironlock — Priority Override / Emergency. Halts execution pipelines and triggers lockdown protocols during critical anomalies.
Ironcast — Switchboard / Notification. Manages outbound alerts, webhooks, and human-in-the-loop escalation routing.
Ironintel — OSINT & Policy Monitor. Scrapes and synthesizes external threat intelligence and regulatory updates.
Ironlogic — Neural Policy Learner. Analyzes historical decisions to propose internal policy optimizations.
Ironmap — Supply Chain Graphing. Maps 3rd/4th Party Vendor Hierarchies and calculates cascading risk.
Irontech — Self-Healing. Restarts failed workers from the last persistent LangGraph checkpoint.
Ironguard — The Warden. AppSec, Token Rotation, and Context Validation. Ensures no API secrets are exposed.
Ironwatch — Anomaly Hunter. Internal User Behavior Analytics (UBA) and Directive Violation monitoring.
Irongate — Data Sanitizer. The DMZ. ALL external ingestion routes here first.
Ironquery — Interactive Analyst / Copilot. Conversational RAG and On-Demand Reporting for end-users.
Ironscout — Ad-Hoc Tracker. Ephemeral worker (TTL: 0.50–71.75 hrs) that self-terminates after completing specific reconnaissance.
Kimbot — Sustainability Analyst. Scope 1-3 and Carbon ALE calculations. Strictly requires physical units (kWh, L, km); monetary-only data rejected.
Ironethic — Social & DEI Monitor. Operates under a strict No-PII Lock. All data must be aggregated and salted.
Irontally — Disclosure & Framework Mapper. Cross-walks data against CSRD, GRI, and ISSB frameworks.
3. Data Security & Ingestion
The Level 2 DMZ Air-Gap:
Irongate Mandate: Agent 14 (Irongate) is the absolute perimeter. ALL external data ingestion (webhooks, API payloads, document uploads, third-party integrations) MUST route through Irongate for sanitization, schema validation, and threat scanning before entering the internal message bus or database.
Forbidden Action: Allowing external ingestion to bypass Irongate is a critical violation and strictly forbidden.
Ironguard Enforcement: Agent 12 (Ironguard) continuously monitors the perimeter for context validation and token rotation, ensuring zero API secrets are committed or leaked.
4. Mathematical & Financial Integrity
The BIGINT Financial Lock:
To prevent floating-point arithmetic errors in financial risk calculations, all USD values MUST be stored as integer cents. Float and Decimal types are strictly forbidden for ALE and all financial fields.
Database Schema: ale_baseline_cents BIGINT NOT NULL
Prisma Schema: aleBaselineCents BigInt
Application Logic: const dollars = Number(aleBaselineCents) / 100;
Constitutionally Frozen ALE Baselines:
These baselines are immutable and serve as the foundation for Irontrust (Agent 3) scoring tests:
Medshield: 11,100,000 USD (1110000000 cents)
Vaultbank: 5,900,000 USD (590000000 cents)
Gridcore: 4,700,000 USD (470000000 cents)
Sustainability Data (Kimbot Mandate):
Carbon metrics require physical units (e.g., kWh, Liters, km). Monetary-only data is strictly rejected by Kimbot (Agent 17). Carbon ALE must be derived from physical unit conversions, never direct financial proxies.
### 4.3 Diagnostics & Isolation (Shadow Plane)
Constitutional scope (GRC Repair 4.7–4.8): structural diagnostics, operational self-tests, and component reliability analytics are **shadow-plane-only** capabilities. They extend the CONTROL-FIRST posture without polluting the production threat ledger.

**Diagnostic isolation (UI boundary)**  
All operational self-test surfaces — **System Pass**, **System Fail** (deficiency filing), and **System Receipt** — MUST be bound to **`isSimulationMode === true`** on the client (`systemConfigStore`). The canonical UI implementation MUST NOT render these controls in production mode (e.g. `PipelineSelfTestBar` returns no DOM when shadow mode is off). Any new diagnostic affordance MUST follow the same rule.

**Architectural boundary (client ↔ server)**  
`isSimulationMode` is not decorative: it is paired with the **`ironframe-simulation-mode`** cookie so server routes and Server Actions observe the same plane. Server code MUST use **`readSimulationPlaneEnabled()`** (`app/lib/security/ingressGateway.ts`, cookie value `1` = shadow) before accepting diagnostic writes or returning shadow-only queues. Client and server checks together form a **hard boundary**; bypassing either side is a constitutional defect.

**Quarantine storage (No-Bleed Rule)**  
Operational deficiencies, self-test passes, and deficiency resolutions MUST be persisted **only** in **`SimulationDiagnosticLog`** (Prisma), keyed to tenant and optional `simThreatId`. These actions MUST NOT be written to production-scoped **`AuditLog`** rows for operational self-test semantics, and MUST NOT attach operational “self-test” narratives to **`ThreatEvent`**. The production audit trail and golden threat ledger remain clean of shadow structural noise. OpSupport “simulation audit” MAY merge simulation-flagged `AuditLog` with `SimulationDiagnosticLog` for display, but diagnostic **writes** stay on `SimulationDiagnosticLog` only.

**Weighted reliability engine (preservation mandate)**  
Component health for PO prioritization is computed by **`calculateComponentHealth`** (`app/lib/opsupport/componentHealth.ts`) from `SimulationDiagnosticLog` payloads. The following weights are **frozen** for all future refactors unless a TAS Amendment explicitly changes them: **Critical deficiency −10**, **High deficiency −5**, **Medium/Low (or unknown severity) deficiency −2**, **System pass +1**. Derived **`healthBarPercent`** (0–100, baseline mapping in `healthPointsToBarPercent`) MUST remain semantically consistent with this scale when refactored.

**Irontech self-healing mandate (Irontech / orchestration)**  
The Irontech workforce MUST treat components with **`healthBarPercent` below 50%** as **priority repair candidates** when consuming shadow diagnostic data (including archived **`OPERATIONAL_DEFICIENCY_REPORT`** payloads and full ingestion snapshots). Lower health indicates higher structural brittleness (e.g. Kimbot pulse surfaces, Attbot state-machine cards) and SHALL drive triage ordering ahead of purely cosmetic backlog work.

**Transparency**  
Every filed deficiency MUST retain the full **Gemini repair packet** and ingestion context required for deterministic repair; replay is surfaced via the OpSupport Diagnostic History / reliability dashboard (read-only modal), not by mutating production records.

5. Multi-Tenant Isolation
Strict RLS & Memory Bleed Prevention:
Database Level: Supabase Row Level Security (RLS) must be explicitly defined and enforced on every table. No query may execute without a validated tenant_id context.
LangGraph Level: Reinterpreting tenant boundaries or allowing cross-tenant memory bleed in LangGraph is a forbidden action. Every LangGraph thread ID must be cryptographically bound to the active tenant_id. State checkpoints must be isolated per tenant.
PII Lock: Ironethic (Agent 18) enforces a strict No-PII lock. All social and DEI data must be aggregated and salted before storage or processing. Raw PII must never persist in the LangGraph state or database.
6. Product Roadmap — Epic Status (PO Authority)
[COMPLETED] Epic 4: Ironwave (Executive Insights & GRC)
Executive Telemetry phase closed. The following are now baseline platform capabilities (not experimental): High-Fidelity Heat Map (including surgical Top 10-by-USD default filtering for grid density), GRC global framework selection and reporting alignment, and the BIGINT Financial Ledger pattern (integer cents for USD; constitutionally frozen ALE baselines unchanged).
[ACTIVE] Epic 5: Kimbot (Sustainability Layer)
Primary modeling shifts from USD financial exposure to physical sustainability units. Kimbot (Agent 17) workstreams target energy (kWh), water/volume (L), and greenhouse-gas equivalents (CO2e) as first-class quantities; monetary-only proxies are out of scope for sustainability ALE. Financial telemetry (Epic 4) remains the stable ledger for fiscal risk; Epic 5 extends the stack without replacing BIGINT rules for USD-bound domains.
TEST COVERAGE CHECK:
Unit Tests Added: YES (Mandated for all Irontrust math and BIGINT conversions)
Integration Tests Added: YES (Mandated for Irongate DMZ routing)
E2E Tests Updated: YES (Mandated via Playwright for UI BIGINT formatting)
ALE Math Covered: YES (Medshield 11.1M, Vaultbank 5.9M, Gridcore 4.7M)
Tenant Isolation Tested: YES (Mandated for Supabase RLS and LangGraph state)