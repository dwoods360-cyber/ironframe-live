/docs/TAS.md — Technical Architecture Specification
Project: Ironframe
Version: 2.0.2 (Sovereign Build State)
Last Updated: 2026-05-07
Authority: Supreme Architectural Authority (Layers 2 & 5)
This document serves as the constitutional foundation for the Ironframe platform. Any deviation from this specification requires a formal TAS Amendment Proposal. Silent structural changes are strictly forbidden.

### LOGGING DIRECTIVE (mandatory — Audit Intelligence) <a id="tas-logging-directive"></a>

**LOGGING DIRECTIVE:** All agent actions and adversarial detections **must** be logged to the Audit Intelligence panel with **100% fidelity**. Silencing logs for agentic or adversarial activity is a **terminal violation** of the Forensic Model.

### GRC forensic constitution & identity (mandatory) <a id="tas-grc-identity"></a>

These rules permanently anchor forensic UI components and dashboard identity; changing them requires a **TAS Amendment Proposal**.

- **Identity rule:** The dashboard MUST initialize in **`[ PENDING SELECTION ]`** tenant state with **no default tenant seeding**. Tenant binding occurs only after explicit **Command Center** tenant selection (and the aligned client cookie sync).

- **Handshake protocol:** Financial optimization / insurance posture alignment MUST trigger a **60-second post-verification drift countdown** (post-handshake integrity window before drift).

- **Forensic artifacts:** The **Print Chip** (Audit Intelligence PDF export) and **Sign-off** control (GRC Gold forensic seal / SHA-256 receipt path) are **non-negotiable gates** for establishing and attesting the **Defense ALE baseline** and associated ledger semantics.

- **UI anchor:** The legacy **header logo** and redundant **“My Organization”** tenant dropdown are **permanently decommissioned** to preserve horizontal density; tenant identity is conveyed via **Command Center** and the **header title line** (`IRONFRAME V1.0 — [tenant | PENDING SELECTION]`).

1. Core Architectural Philosophy <a id="tas-core-philosophy"></a>
Ironframe is engineered for structured speed under a CONTROL-FIRST paradigm. Our core philosophy rests on three pillars:
Modular Execution: Strict separation of concerns enforced via a specialized agent workforce.
Zero-Trust Data Ingestion: No external payload enters the internal message bus or database without cryptographic and structural sanitization.
Persistent LangGraph State Memory: Human-in-the-loop observability and self-healing capabilities powered by immutable state checkpoints. <a id="tas-langgraph-memory"></a>
The Sovereign Stack:
Framework: Next.js 15.1.6 with Turbopack
Database & Auth: Supabase (PostgreSQL)
ORM: Prisma
Styling: Tailwind CSS
AI Orchestration: Vercel AI SDK + LangGraph.js <a id="tas-langgraph-js"></a>
IDE: Cursor (Exclusive)
Testing: Playwright (E2E) + Vitest (Unit/Integration)
Infrastructure: Google Cloud Platform (via GitHub Actions CI/CD)
2. The 19-Agent Workforce <a id="tas-nineteen-agent-roster"></a>
<a id="tas-langgraph-checkpoints"></a>The Ironframe AI system operates via a strict 19-agent roster. No agent may expand beyond its defined Core Directive. LangGraph state memory ensures persistent checkpoints and prevents cross-tenant memory bleed.
<a id="agent-1"></a>Ironcore — Orchestrator & Routing. The central nervous system directing traffic to specialized agents.
<a id="agent-2"></a>Ironwave — Live Telemetry Monitoring. Ingests and standardizes real-time system health and performance metrics.
<a id="agent-3"></a>Irontrust — Scoring Engine. Executes ALE Math (Constitutionally Frozen). Modifying this math requires 100% unit test coverage and snapshot comparison.
<a id="agent-8"></a>Ironsight — Tactical Sentinel. High-Fidelity Active Risk Scanner for immediate threat vector identification.
<a id="agent-5"></a>Ironscribe — Deep-Doc Worker. Document parsing, OCR, and unstructured data extraction.
<a id="agent-6"></a>Ironlock — Priority Override / Emergency. Halts execution pipelines and triggers lockdown protocols during critical anomalies.
<a id="agent-7"></a>Ironcast — Switchboard / Notification. Manages outbound alerts, webhooks, and human-in-the-loop escalation routing.
<a id="agent-11"></a>Ironintel — OSINT & Policy Monitor. Scrapes and synthesizes external threat intelligence and regulatory updates.
<a id="agent-9"></a>Ironlogic — Neural Policy Learner. Analyzes historical decisions to propose internal policy optimizations.
<a id="agent-10"></a>Ironmap — Supply Chain Graphing. Maps 3rd/4th Party Vendor Hierarchies and calculates cascading risk.
<a id="agent-4"></a><a id="tas-lkg"></a>Irontech — Self-Healing. Restarts failed workers from the last persistent LangGraph checkpoint.
<a id="agent-12"></a>Ironguard — The Warden. AppSec, Token Rotation, and Context Validation. Ensures no API secrets are exposed.
<a id="agent-13"></a>Ironwatch — Anomaly Hunter. Internal User Behavior Analytics (UBA) and Directive Violation monitoring.
<a id="agent-14"></a>Irongate — Data Sanitizer. The DMZ. ALL external ingestion routes here first.
<a id="agent-15"></a>Ironquery — Interactive Analyst / Copilot. Conversational RAG and On-Demand Reporting for end-users.
<a id="agent-16"></a>Ironscout — Ad-Hoc Tracker. Ephemeral worker (TTL: 0.50–71.75 hrs) that self-terminates after completing specific reconnaissance.
<a id="agent-17"></a><a id="ironbloom-production"></a>Ironbloom — Sustainability Analyst. Scope 1-3 and Carbon ALE calculations. Strictly requires physical units (kWh, L, km); monetary-only data rejected.
<a id="agent-18"></a>Ironethic — Social & DEI Monitor. Operates under a strict No-PII Lock. All data must be aggregated and salted.
<a id="agent-19"></a>Irontally — Disclosure & Framework Mapper. Cross-walks data against CSRD, GRI, and ISSB frameworks.

<a id="tas-simulation-bots"></a>**Simulation Bots (A–D) — Separate from 19-Agent Workforce**
Kimbot, Attbot, and GRCbot are **shadow-plane antagonists** for structural drills and red-team testing. They are **not** numbered agents in the 19-agent production roster.
- **Bot A (Attbot):** External attack / chaos simulation (`ATTACK_BOT`).
- **Bot B (Kimbot):** Red-team adversary threat injector (`KIMBOT`). Injects simulated ransomware, data leak, and API breach signals into the threat pipeline for dual-key and ACK drill exercises.
- **Bot C (GRCbot):** Policy drift and GRC gate QA (`GRC_BOT`).
- **Master Purge:** Clears simulation-scoped pipeline state; production audit ledger remains isolated per §4.3.

**Naming lock:** Agent 17 in the production workforce is **Ironbloom** (CSRD / sustainability ledger, physical units only). **Kimbot is Bot B (red team), not Agent 17.** Do not conflate Kimbot with Ironbloom.

3. Data Security & Ingestion <a id="tas-data-security-ingestion"></a>
<a id="tas-dmz-air-gap"></a>The Level 2 DMZ Air-Gap:
Irongate Mandate: Agent 14 (Irongate) is the absolute perimeter. ALL external data ingestion (webhooks, API payloads, document uploads, third-party integrations) MUST route through Irongate for sanitization, schema validation, and threat scanning before entering the internal message bus or database.
Forbidden Action: Allowing external ingestion to bypass Irongate is a critical violation and strictly forbidden.
Ironguard Enforcement: Agent 12 (Ironguard) continuously monitors the perimeter for context validation and token rotation, ensuring zero API secrets are committed or leaked.
4. Mathematical & Financial Integrity <a id="tas-mathematical-financial-integrity"></a>
<a id="tas-bigint-lock"></a>The BIGINT Financial Lock:
To prevent floating-point arithmetic errors in financial risk calculations, all USD values MUST be stored as integer cents. Float and Decimal types are strictly forbidden for ALE and all financial fields.
<a id="tas-ale-baseline-cents"></a>Database Schema: ale_baseline_cents BIGINT NOT NULL
Prisma Schema: aleBaselineCents BigInt
Application Logic: const dollars = Number(aleBaselineCents) / 100;
<a id="tas-ale-baselines"></a>Constitutionally Frozen ALE Baselines:
These baselines are immutable and serve as the foundation for Irontrust (Agent 3) scoring tests:
Medshield: 11,100,000 USD (1110000000 cents)
Vaultbank: 5,900,000 USD (590000000 cents)
Gridcore: 4,700,000 USD (470000000 cents)
Defense (CMMC L3 anchor): 16,000,000 USD (1600000000 cents)

**METRICS:** The Version Manifest (Audit Intelligence sidebar footer) MUST include **DRIFT_DELTA**: real-time variance between **active ALE** (BIGINT aggregate from `getTotalCurrentRiskCentsString` / Command Center posture) and the **constitutional industry baseline** for the bound tenant (Medshield / Vaultbank / Gridcore / Defense cents above). Display uses a **Δ** prefix; negative Δ (active below baseline) indicates optimization posture; positive Δ indicates elevated exposure vs. baseline. When no tenant route/dev scope is bound, the line shows **Δ ---**.

<a id="tas-sustainability-kimbot"></a><a id="tas-sustainability-ironbloom"></a>Sustainability Data (Ironbloom Mandate):
Carbon metrics require physical units (e.g., kWh, Liters, km). Monetary-only data is strictly rejected by Ironbloom (Agent 17). Carbon ALE must be derived from physical unit conversions, never direct financial proxies. Kimbot (simulation Bot B) does not own production sustainability metrics.
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

<a id="tas-irontech-self-healing"></a>**Irontech self-healing mandate (Irontech / orchestration)**  
The Irontech workforce MUST treat components with **`healthBarPercent` below 50%** as **priority repair candidates** when consuming shadow diagnostic data (including archived **`OPERATIONAL_DEFICIENCY_REPORT`** payloads and full ingestion snapshots). Lower health indicates higher structural brittleness (e.g. Kimbot pulse surfaces, Attbot state-machine cards) and SHALL drive triage ordering ahead of purely cosmetic backlog work.

**Transparency**  
Every filed deficiency MUST retain the full **Gemini repair packet** and ingestion context required for deterministic repair; replay is surfaced via the OpSupport Diagnostic History / reliability dashboard (read-only modal), not by mutating production records.

5. Multi-Tenant Isolation <a id="tas-multi-tenant-isolation"></a>

<a id="tas-ironlock-quarantine"></a>**AMENDMENT:** Any function, agent, or fetch call that lacks a validated tenant_id context is prohibited and must be quarantined by Ironlock.

**DIRECTIVE:** Cross-tenant data retrieval is a terminal failure. The system must hard-crash rather than return data from an unrestricted context.

<a id="tas-rls-isolation"></a><a id="tas-row-level-security"></a>Strict RLS & Memory Bleed Prevention:
Database Level: Supabase Row Level Security (RLS) must be explicitly defined and enforced on every tenant-scoped table (direct `tenant_id` / `tenantId` columns or an approved join path documented below). Global reference tables (e.g. anonymized industry benchmarks) are exempt only where explicitly listed in schema commentary. No tenant-bound query may execute without a validated tenant context; Postgres sessions SHOULD set `app.current_tenant_id` (via `ironguard_set_session_tenant`) before RLS-protected operations once policies are enabled.

**Schema reality (verification):** Some legacy surfaces use indirect tenancy (e.g. `ThreatEvent.tenantCompanyId` → `companies.tenantId`). RLS policies MUST encode those join paths; tables without any tenancy linkage remain engineering debt and must not carry tenant-controlled payloads until amended.

<a id="tas-langgraph-tenant-isolation"></a>LangGraph Level: Reinterpreting tenant boundaries or allowing cross-tenant memory bleed in LangGraph is a forbidden action. Every LangGraph thread ID must be cryptographically bound to the active tenant_id. State checkpoints must be isolated per tenant.

Client plane (Ironguard): Outbound same-origin `/api` requests that carry `x-tenant-id` / `x-target-tenant-id` must match the Command-Center–resolved effective tenant session or the client throws `[ 🚫 IRONGUARD BREACH ] | UNAUTHORIZED CROSS-TENANT FETCH BLOCKED.` Same-origin `/api` reads/writes without an optional-route carve-out must resolve an effective tenant UUID; otherwise the client throws `[ 🚫 IRONGUARD ] | FETCH BLOCKED: NO TENANT CONTEXT.` All such requests automatically attach `X-Tenant-ID` from the secure session after injection.

**Rule:** The Dev Tenant Switcher must trigger a **Cold Boot** of all data stores (`switchDevTenantColdBoot`): risks, audit buffer, agent streams, cached dashboard/insurance payloads, and session tenant flush — **before** the new override applies. No cross-tenant data persistence is permitted between those transitions.

Command Center tenant switches MUST purge client tenant scope (risk boards, agent streams, audit buffer) and invalidate tenant-scoped API cache hints before loading the next tenant.

### Immutable Directives (Isolation — Non-Bypassable)

The following rules are **constitutional**: bypass requires a formal **TAS Amendment** and PO sign-off.

1. **Kernel:** PostgreSQL RLS **must** ultimately enforce `tenant_id` (or approved join-path equivalents) for tenant-bound rows. Tables lacking a tenant discriminator suitable for policy attachment are **engineering debt** and must not hold unsliced tenant payloads until remediated (see `docs/FORENSIC_INTEGRITY_REPORT.md`).

2. **Gateway (server):** Tenant-scoped Route Handlers **must** validate `x-tenant-id` against the **`ironframe-tenant`** cookie session when the cookie is present; mismatch → **403 Forbidden**. Client-only tenant props are **never** sufficient authorization.

3. **Gateway (client):** Ironguard **must** inject `X-Tenant-ID` from the secure effective session and **must** throw on cross-tenant header misuse; blocked attempts **must** emit the Sentinel audit line (`IRONGUARD|SENTINEL_BLOCK`) in Audit Intelligence.

4. **Memory:** `resetAllStores()` **must** run **before** `tenantScopeCache.clear()` **before** binding a new tenant context on Command Center or Dev switcher transitions — **no shadow RAM** from prior tenant boards, bots, scenarios, or overlays.

5. **Ledger:** Any isolation breach attempt blocked in the client **must** leave a durable sidebar audit entry (`[ 🚨 SECURITY ALERT ] | ISOLATION BREACH ATTEMPT BLOCKED…`).

**Amendment — Internal Simulation Loop (Shadow Plane exception)**  
Immutable directives **(1)–(5)** apply without exception in **production** tenant sessions. For the **internal simulation / shadow plane** only (`SHADOW_PLANE_ACTIVE` server-side, paired per §4.3 with `ironframe-simulation-mode` and/or `NEXT_PUBLIC_SHADOW_PLANE_ACTIVE` / Command Center simulation): server Route Handlers **may** accept a validated `x-tenant-id` when it conflicts with `ironframe-tenant` **solely** to unblock automated simulation clients and dashboard reads during drills — implemented in `assertIronguardApiTenantOr403` + shadow diagnostics elsewhere. This **does not** weaken PostgreSQL RLS or LangGraph tenant binding; it **only** prevents false **403** mismatches between cookie snapshot and bot-declared scope during testing. Quarantine and **SimulationDiagnosticLog** isolation from §4.3 remain mandatory.

<a id="tas-ironethic-pii"></a>PII Lock: Ironethic (Agent 18) enforces a strict No-PII lock. All social and DEI data must be aggregated and salted before storage or processing. Raw PII must never persist in the LangGraph state or database.
6. Product Roadmap — Epic Status (PO Authority)
[COMPLETED] Epic 4: Ironwave (Executive Insights & GRC)
Executive Telemetry phase closed. The following are now baseline platform capabilities (not experimental): High-Fidelity Heat Map (including surgical Top 10-by-USD default filtering for grid density), GRC global framework selection and reporting alignment, and the BIGINT Financial Ledger pattern (integer cents for USD; constitutionally frozen ALE baselines unchanged).
[ACTIVE] Epic 5: Ironbloom (Sustainability Layer)
Primary modeling shifts from USD financial exposure to physical sustainability units. Ironbloom (Agent 17) workstreams target energy (kWh), water/volume (L), and greenhouse-gas equivalents (CO2e) as first-class quantities; monetary-only proxies are out of scope for sustainability ALE. Financial telemetry (Epic 4) remains the stable ledger for fiscal risk; Epic 5 extends the stack without replacing BIGINT rules for USD-bound domains.
TEST COVERAGE CHECK:
Unit Tests Added: YES (Mandated for all Irontrust math and BIGINT conversions)
Integration Tests Added: YES (Mandated for Irongate DMZ routing)
E2E Tests Updated: YES (Mandated via Playwright for UI BIGINT formatting)
ALE Math Covered: YES (Medshield 11.1M, Vaultbank 5.9M, Gridcore 4.7M)
Tenant Isolation Tested: YES (Mandated for Supabase RLS and LangGraph state)