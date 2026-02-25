/docs/TAS.md — Technical Architecture Specification
Project: Ironframe
Version: 2.0.0 (Sovereign Build State)
Last Updated: 2026-02-25
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
Ironbloom — Sustainability Analyst. Scope 1-3 and Carbon ALE calculations. Strictly requires physical units.
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
Sustainability Data (Ironbloom Mandate):
Carbon metrics require physical units (e.g., kWh, Liters, km). Monetary-only data is strictly rejected by Ironbloom (Agent 17). Carbon ALE must be derived from physical unit conversions, never direct financial proxies.
5. Multi-Tenant Isolation
Strict RLS & Memory Bleed Prevention:
Database Level: Supabase Row Level Security (RLS) must be explicitly defined and enforced on every table. No query may execute without a validated tenant_id context.
LangGraph Level: Reinterpreting tenant boundaries or allowing cross-tenant memory bleed in LangGraph is a forbidden action. Every LangGraph thread ID must be cryptographically bound to the active tenant_id. State checkpoints must be isolated per tenant.
PII Lock: Ironethic (Agent 18) enforces a strict No-PII lock. All social and DEI data must be aggregated and salted before storage or processing. Raw PII must never persist in the LangGraph state or database.
TEST COVERAGE CHECK:
Unit Tests Added: YES (Mandated for all Irontrust math and BIGINT conversions)
Integration Tests Added: YES (Mandated for Irongate DMZ routing)
E2E Tests Updated: YES (Mandated via Playwright for UI BIGINT formatting)
ALE Math Covered: YES (Medshield 11.1M, Vaultbank 5.9M, Gridcore 4.7M)
Tenant Isolation Tested: YES (Mandated for Supabase RLS and LangGraph state)