# Corporate Subprocessor List

Source of truth in product: trust center subprocessors page

**Status:** Draft for counsel / brief-advice review — not counsel-approved.

---

## Vercel Inc. — Application hosting

Purpose: Next.js edge and serverless execution, environment secret injection, deployment quarantine controls. Data categories: HTTP logs, request metadata, application configuration. Region: United States (Customer production project configuration).

## Supabase Inc. — Database & authentication

Purpose: PostgreSQL persistence, Supabase Auth (email/password, invite flows), row-level security policies. Data categories: operator credentials, tenant-scoped GRC records, session tokens. Region: single-region project binding selected at provisioning (see Data Residency Statement).

## Resend — Transactional email

Purpose: Ironcast operator notifications, threat confirmation routing, invite delivery hand-off where configured. Data categories: recipient email addresses, notification payloads (parameterized templates).

## Stripe Inc. — Payment processing

Purpose: Command Tier subscription collection, payment_intent.succeeded webhook activation of TenantBilling.status ACTIVE. Data categories: billing contact email, payment method tokens (PCI scope on Stripe), checkout metadata (tenant_slug). Monetary amounts stored in Ironframe as BigInt integer cents only.

## Google (Gemini) — Model inference

Purpose: Ironsight narrative synthesis, nightly governance narrate cron (03:30 UTC), Ironquery analyst insights. Data categories: de-classified telemetry JSON per narrate system prompt — no raw CVE identifiers or raw asset UUIDs in model output.

## Electricity Maps — Grid carbon intensity

Purpose: Ironbloom physical-unit sustainability telemetry (kWh-derived CO₂e). Data categories: aggregated grid-zone coefficients — no monetary-only carbon proxies accepted.
