/**
 * Procurement and compliance artifacts — design-partner diligence pack (not legal advice).
 * Rendered inside authenticated dashboard trust center for security architecture reviews.
 */

export type ProcurementDocumentSection = {
  id: string;
  title: string;
  body: string;
};

export const DPA_FRAMEWORK_SECTIONS: readonly ProcurementDocumentSection[] = [
  {
    id: "scope",
    title: "1. Processing scope",
    body: `Ironframe GRC processes Customer Personal Data solely to deliver the subscribed Command Tier workspace: authentication identifiers, operator audit logs, uploaded GRC evidence, threat telemetry sanitized through Irongate (Agent 14), and BigInt-cent financial risk registers. Processing occurs under Customer instructions documented in the order form and this Data Processing Addendum framework.`,
  },
  {
    id: "roles",
    title: "2. Controller / processor roles",
    body: `Customer is the controller for tenant-uploaded content and workforce identifiers within the workspace. Ironframe GRC acts as processor for that content and as an independent controller for platform security telemetry required to operate the service (rate limiting, intrusion detection, cron health checks).`,
  },
  {
    id: "subprocessors",
    title: "3. Subprocessors",
    body: `Customer authorizes the subprocessors listed in the Corporate Subprocessor List. Ironframe will provide thirty (30) days' notice of material subprocessor changes via the trust center or written notice to the Customer security contact.`,
  },
  {
    id: "security",
    title: "4. Technical and organizational measures",
    body: `Measures include: zero-trust external ingestion via Irongate; PostgreSQL tenant isolation with session-scoped RLS GUCs; Ironguard client cross-tenant fetch blocks; immutable ThreatEvent WORM ledger (Epic 12); BIGINT-only USD monetary fields; encrypted transport (TLS 1.2+); secrets stored in Vercel/Supabase environment vaults — never in repository source.`,
  },
  {
    id: "breach",
    title: "5. Personal data breach notification",
    body: `Ironframe will notify Customer without undue delay after confirming a Personal Data Breach affecting Customer data, including available facts, containment steps, and remediation timeline. Customer maintains primary regulatory notification obligations.`,
  },
  {
    id: "deletion",
    title: "6. Return and deletion",
    body: `Upon termination, Customer may export tenant data via standard dashboard exports. Ironframe deletes production copies within thirty (30) days after export window completion, except where retention is required by law or sealed WORM evidence obligations explicitly contracted.`,
  },
  {
    id: "audit",
    title: "7. Audit cooperation",
    body: "Ironframe will make available SOC 2-aligned control narratives, integration test evidence, and TAS constitutional fingerprint artifacts (/api/grc/tas-integrity) subject to confidentiality and reasonable scope limits.",
  },
] as const;

export const SUBPROCESSOR_LIST_SECTIONS: readonly ProcurementDocumentSection[] = [
  {
    id: "hosting",
    title: "Vercel Inc. — Application hosting",
    body: `Purpose: Next.js edge and serverless execution, environment secret injection, deployment quarantine controls. Data categories: HTTP logs, request metadata, application configuration. Region: United States (Customer production project configuration).`,
  },
  {
    id: "database",
    title: "Supabase Inc. — Database & authentication",
    body: `Purpose: PostgreSQL persistence, Supabase Auth (email/password, invite flows), row-level security policies. Data categories: operator credentials, tenant-scoped GRC records, session tokens. Region: single-region project binding selected at provisioning (see Data Residency Statement).`,
  },
  {
    id: "email",
    title: "Resend — Transactional email",
    body: `Purpose: Ironcast operator notifications, threat confirmation routing, invite delivery hand-off where configured. Data categories: recipient email addresses, notification payloads (parameterized templates).`,
  },
  {
    id: "payments",
    title: "Stripe Inc. — Payment processing",
    body: `Purpose: Command Tier subscription collection, payment_intent.succeeded webhook activation of TenantBilling.status ACTIVE. Data categories: billing contact email, payment method tokens (PCI scope on Stripe), checkout metadata (tenant_slug). Monetary amounts stored in Ironframe as BigInt integer cents only.`,
  },
  {
    id: "ai",
    title: "Google (Gemini) — Model inference",
    body: `Purpose: Ironsight narrative synthesis, nightly governance narrate cron (03:30 UTC), Ironquery analyst insights. Data categories: de-classified telemetry JSON per narrate system prompt — no raw CVE identifiers or raw asset UUIDs in model output.`,
  },
  {
    id: "carbon",
    title: "Electricity Maps — Grid carbon intensity",
    body: `Purpose: Ironbloom physical-unit sustainability telemetry (kWh-derived CO₂e). Data categories: aggregated grid-zone coefficients — no monetary-only carbon proxies accepted.`,
  },
] as const;

export const DATA_RESIDENCY_SECTIONS: readonly ProcurementDocumentSection[] = [
  {
    id: "posture",
    title: "1. Single-region sovereignty posture",
    body: `Ironframe Phase 1 design-partner deployments intentionally use a single-region Supabase PostgreSQL project and colocated Vercel functions. We do not implement speculative multi-region database routing layers in v0.1.0-ga-epic17. Customer data residency is anchored to the provisioned Supabase region documented in the order form.`,
  },
  {
    id: "tenant-isolation",
    title: "2. Tenant enclave isolation",
    body: `Each Customer receives a dedicated tenant UUID, DNS slug workspace, and PostgreSQL RLS session binding via ironguard_set_session_tenant. Cross-tenant retrieval is a terminal failure — the platform hard-crashes rather than returning unrestricted rows.`,
  },
  {
    id: "ingress",
    title: "3. Ingress and egress controls",
    body: `All external webhooks (including /api/billing/webhook) traverse Irongate signature verification before mutating billing state. Deployment quarantine blocks public UI ingress on preview hosts while preserving token-gated cron and Stripe webhook paths.`,
  },
  {
    id: "backup",
    title: "4. Backup and replication",
    body: `Database backups follow Supabase platform policies for the selected region. Customer-initiated exports remain the authoritative portability mechanism for diligence and exit scenarios.`,
  },
  {
    id: "transfers",
    title: "5. International transfers",
    body: `Where Customer personnel access the workspace from outside the hosting region, authentication and audit logs may reflect those jurisdictions. Standard contractual clauses or equivalent mechanisms apply where required.`,
  },
  {
    id: "roadmap",
    title: "6. Roadmap boundary",
    body: `Multi-region active-active database routing is explicitly out of scope for v0.1.0-ga-epic17. Any future region expansion requires a TAS Amendment Proposal and updated DPA subprocessor annex.`,
  },
] as const;

export const TRUST_CENTER_ARTIFACTS = [
  {
    slug: "dpa",
    href: "/trust/dpa",
    title: "Data Processing Addendum (DPA) Framework",
    summary: "Processor obligations, security measures, breach notification, and audit cooperation.",
  },
  {
    slug: "subprocessors",
    href: "/trust/subprocessors",
    title: "Corporate Subprocessor List",
    summary: "Vercel, Supabase, Resend, Stripe, Google Gemini, Electricity Maps — purpose and data categories.",
  },
  {
    slug: "data-residency",
    href: "/trust/data-residency",
    title: "Single-Region Data Residency & Infrastructure Sovereignty",
    summary: "Single-region Supabase anchor, tenant enclave isolation, and v0.1.0-ga-epic17 boundaries.",
  },
] as const;
