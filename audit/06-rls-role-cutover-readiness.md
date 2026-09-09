# RLS Application-Role Cutover Readiness

**Production baseline:** `944da05a`
**Assessment date:** 2026-09-09
**Verdict:** **BLOCKED — do not replace the production `DATABASE_URL` with a `NOBYPASSRLS` role yet.**

## Scope

This follow-up reviewed the clean merged production snapshot rather than the primary checkout's
uncommitted work. It covered Prisma client construction, request and server-action access,
background workers and cron routes, administrative paths, Supabase transaction-pooler behavior,
RLS policy shape, and LangGraph checkpoint storage.

## Evidence Summary

- Approximately 158 request-path files import the primary Prisma client.
- Only four ingress cores and part of the threat transaction wrapper bind
  `app.current_tenant_id`.
- Explicit Prisma `tenantId` predicates do not satisfy restrictive PostgreSQL policies when the
  transaction-local tenant GUC is absent.
- `prismaAdmin` is an alias of the application client, not a separate privileged connection.
- Global cron and administrative scans require deliberate privilege separation or per-tenant
  iteration.
- `threat_events` is not covered by the dynamic rollout because it uses `tenantCompanyId` rather
  than `tenant_id`.
- LangGraph uses an independent `pg.Pool`; tenant ownership is checked after checkpoint lookup,
  and the saver tables do not have a database RLS boundary.
- `companies` and `user_role_assignments` are deliberately excluded from dynamic RLS and remain
  dependent on application authorization.

## Immediate Defects Corrected on the Remediation Branch

1. Removed the AuditLog extension's fallback to the first tenant. Missing tenant context now
   fails closed.
2. Added `withIronguardTenant`, a common transaction wrapper that validates a tenant UUID and
   binds the transaction before tenant-scoped work.
3. Corrected threat transaction binding. A company bigint is no longer written into
   `app.current_tenant_id`; the company is resolved to its tenant UUID first.
4. Updated the standalone Ironboard CRM RLS script to create permissive base policies before its
   restrictive tenant policies.
5. Added unit and architecture tests for the common binding wrapper and CRM policy shape.

These fixes reduce immediate risk but do not make the application ready for role cutover.

## Remaining Cutover Blockers

### Request and action migration

Every tenant-scoped route, server action, component loader, and service must execute through a
tenant-bound transaction. Existing explicit predicates remain required as defense in depth.

### ThreatEvent database isolation

Add a canonical tenant UUID to `threat_events`, backfill it from `companies`, enforce referential
integrity, and add RLS; or deploy an equivalent policy using a verified join. Preview migration
and behavioral tests are mandatory.

### Checkpoint isolation

LangGraph thread lookup alone is not an isolation boundary. Checkpoint storage must receive a
database-enforceable tenant key and policy, or be moved behind a dedicated tenant-aware storage
adapter. Tenant parity must be checked before checkpoint state is returned.

### Privileged worker separation

Provision distinct roles and connection variables:

- `ironframe_app`: `NOBYPASSRLS`, tenant-scoped application requests.
- `ironframe_privileged`: narrowly used by audited cross-tenant monitors and platform operations.
- migration/maintenance role: schema deployment, controlled purge, and seeding only.

Imports of a privileged client should be restricted by an architecture-test allowlist.

### Cron refactor

Global discovery and tenant processing must be separated. Tenant work must iterate tenants and
bind each transaction. Truly global monitoring must use the privileged role with explicit
authorization and audit logging.

## Required Verification Before Production Cutover

1. Run TypeScript, unit, integration, and authenticated Playwright suites.
2. Deploy to the Supabase preview branch with an `ironframe_app` `NOBYPASSRLS` credential.
3. Verify an unbound connection sees zero tenant rows and cannot write.
4. Verify each bound tenant sees and mutates only its own rows.
5. Execute cross-tenant negative tests for request paths, cron paths, ThreatEvent, CRM, audit logs,
   and checkpoints.
6. Verify privileged operations are inaccessible from ordinary tenant request handlers.
7. Deploy application code before rotating production `DATABASE_URL`.
8. Monitor authorization failures and rollback without restoring shared privileged credentials to
   tenant request paths.

## Decision

Keep the current database-role cutover deferred. Continue with the request-path migration,
special-table policies, privileged-client separation, and preview proof. No production database
role, credential, or policy mutation is authorized by this assessment.
