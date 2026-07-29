# Single-Region Data Residency & Infrastructure Sovereignty

Source of truth in product: trust center data-residency page

**Status:** Draft for counsel / brief-advice review — not counsel-approved.

---

## 1. Single-region sovereignty posture

Ironframe Phase 1 design-partner deployments intentionally use a single-region Supabase PostgreSQL project and colocated Vercel functions. We do not implement speculative multi-region database routing layers in v0.1.0-ga-epic17. Customer data residency is anchored to the provisioned Supabase region documented in the order form.

## 2. Tenant enclave isolation

Each Customer receives a dedicated tenant UUID, DNS slug workspace, and PostgreSQL RLS session binding via ironguard_set_session_tenant. Cross-tenant retrieval is a terminal failure — the platform hard-crashes rather than returning unrestricted rows.

## 3. Ingress and egress controls

All external webhooks (including /api/billing/webhook) traverse Irongate signature verification before mutating billing state. Deployment quarantine blocks public UI ingress on preview hosts while preserving token-gated cron and Stripe webhook paths.

## 4. Backup and replication

Database backups follow Supabase platform policies for the selected region. Customer-initiated exports remain the authoritative portability mechanism for diligence and exit scenarios.

## 5. International transfers

Where Customer personnel access the workspace from outside the hosting region, authentication and audit logs may reflect those jurisdictions. Standard contractual clauses or equivalent mechanisms apply where required.

## 6. Roadmap boundary

Multi-region active-active database routing is explicitly out of scope for v0.1.0-ga-epic17. Any future region expansion requires a TAS Amendment Proposal and updated DPA subprocessor annex.
