# Forensic Integrity Report — Zero-Trust Tenant Isolation Audit

**Authority:** Principal Security Architect / Principal Systems Engineer  
**Generated:** 2026-05-07  
**Scope:** Prisma schema (`prisma/schema.prisma`), migrations under `prisma/migrations/`, client Ironguard (`app/utils/apiClient.ts`), server API guard (`app/lib/security/ironguardApiGuard.ts`), client stores (`app/store/`), cold-boot utilities (`app/store/resetAllStores.ts`).

---

## LAYER 1 — Database kernel (PostgreSQL / Prisma)

### Verification method

- Enumerated all `model` tables mapped via `@@map` or default naming.
- Classified each as: **Direct `tenant_id` / `tenantId`**, **Indirect tenancy (FK/join)**, **Global / singleton / exempt**, or **CRITICAL GAP** (tenant-controlled data without row-level tenant discriminator suitable for RLS).

### RLS migration status

- `prisma/migrations/20260507200000_ironguard_session_tenant_guc/migration.sql` defines **`ironguard_set_session_tenant(uuid)`** for `SET LOCAL app.current_tenant_id`.
- **Full ENABLE ROW LEVEL SECURITY + FORCE** on all tenant tables is **not** applied in one shot: application connections must set the GUC per transaction before policies return rows; otherwise Prisma queries would see empty sets or fail.

### Table inventory (abbrev.)

| Table / model | Tenant linkage | RLS-ready note |
|---------------|----------------|----------------|
| `Tenant` (`tenants`) | Registry | **Exempt** — defines tenants; policy by `id = session` when listing own row |
| `MarketBenchmarkSnapshot` | None | **Global benchmark** — exempt with governance review |
| `Company`, `Vendor`, `AgentLog`, `AgentComputeLog`, `RiskEvent` (`SimThreatEvent`), `AuditLog`, `BotAuditLog`, `user_role_assignments`, `evidence_*`, `integrity_*`, etc. | Direct UUID | **RLS candidate** — `tenant_id` / `tenantId` present |
| `Department`, `Policy`, `ActiveRisk` | Via `company_id` → `companies.tenantId` | **Indirect** — policies must join `companies` |
| `ThreatEvent` | `tenantCompanyId` only | **CRITICAL GAP** — no UUID `tenant_id` on row; isolation relies on join to `companies` |
| `AgentReasoning`, `AgentOperation`, `WorkNote`, `SustainabilityMetric` | Via `threatId` → `ThreatEvent` | **CRITICAL GAP path** — inherits production-threat linkage; RLS via join/subquery |
| `SimulationConfig`, `SystemConfig`, `ChaosConfig`, `DailySnapshot`, `MarketBenchmarkSnapshot` | Global/singleton | **Exempt** — not per-tenant rows |
| `CommunityInsights`, `CommunityIntelligence`, `SyntheticEmployee`, `IronwatchLog` | None / simulation global | **Flagged** — classify under platform policy (non-production tenant PII) |
| `ClearanceRequest` | Partial (`riskEventId` nullable) | **Review** — tie to shadow tenant via risk join |
| `SentinelAutomationOutbox` | Optional `tenant_scope` | **Review** — nullable scope |

### Fixes applied (this change set)

1. Documented **CRITICAL** rows where indirect tenancy or missing `tenant_id` blocks naive `WHERE tenant_id = current_setting(...)` without joins.
2. Retained **GUC helper** migration as the kernel hook for phased RLS rollout.

---

## LAYER 2 — API gateway (Ironguard scoping)

### Files checked

- `app/utils/apiClient.ts` — client injection + mismatch throws + sentinel logging.
- `app/lib/security/ironguardApiGuard.ts` — **new**: compares `x-tenant-id` to `ironframe-tenant` cookie when cookie present; **403** on mismatch.
- `app/api/dashboard/route.ts` — wired to server guard.

### Fixes applied

1. Server-side **`assertIronguardApiTenantOr403`** returns **403** when session cookie resolves to a UUID and **`x-tenant-id`** differs.
2. When cookie absent, header UUID is still used for the payload (backward compatibility for edge bootstrap); documented as residual risk to tighten with signed session.

---

## LAYER 3 — State memory (cold boot)

### Files checked

- `app/store/*.ts` — Zustand modules with tenant-adjacent scratch state.
- `app/context/TenantProvider.tsx` — `switchDevTenantColdBoot`.
- `app/utils/purgeClientTenantScope.ts`.

### Fixes applied

1. **`resetAllStores()`** (`app/store/resetAllStores.ts`) — clears risk pipeline, agent streams, audit buffer, Kimbot/GRC bot/sim overlays, scenario multiplier, compliance overlay scratch, board readiness, adversary sim, agentic compute samples.
2. **`tenantScopeCache.clear()`** (`app/utils/apiCacheCoordinator.ts`) — dispatches cache invalidation event for dashboard shell.
3. **`switchDevTenantColdBoot`** / **`purgeClientTenantScopeAfterSwitch`** — call **`resetAllStores()`** then **`tenantScopeCache.clear()`** before resetting tenant session line.

---

## LAYER 4 — Audit ledger (sentinel)

### Files checked

- `app/utils/isolationSentinelLog.ts` — **new**.
- `app/utils/apiClient.ts` — invokes sentinel before throwing Ironguard errors.

### Fixes applied

1. On client **`IRONGUARD_BREACH`** / **`IRONGUARD_NO_TENANT`**, append deferred audit row:  
   `[ 🚨 SECURITY ALERT ] | ISOLATION BREACH ATTEMPT BLOCKED. LOGGING AGENT CONTEXT: …`

---

## Files touched (summary)

| File | Action |
|------|--------|
| `docs/FORENSIC_INTEGRITY_REPORT.md` | Created (this report) |
| `docs/TAS.md` | Immutable Directives for isolation |
| `app/lib/security/ironguardApiGuard.ts` | Created |
| `app/api/dashboard/route.ts` | Server Ironguard guard |
| `app/store/resetAllStores.ts` | Created |
| `app/lib/security/ironguardApiGuard.ts` | Created — cookie vs header **403** |
| `app/api/dashboard/route.ts` | Uses `assertIronguardApiTenantOr403` |
| `app/utils/apiCacheCoordinator.ts` | `tenantScopeCache.clear()` |
| `app/utils/isolationSentinelLog.ts` | Created |
| `app/utils/apiClient.ts` | Sentinel hooks on throw paths |
| `app/utils/purgeClientTenantScope.ts` | `resetAllStores()` + `tenantScopeCache.clear()` |
| `app/context/TenantProvider.tsx` | Cold boot uses purge (full reset) |
| `app/components/TenantSwitcher.tsx` | Purge includes cache via unified purge util |
| `docs/TAS.md` | Immutable Directives §5 |

---

## Residual risks (explicit)

1. **RLS not enabled** on all tables until DB session sets `app.current_tenant_id` on every connection path.
2. **`ThreatEvent`** lacks UUID `tenant_id`; cross-tenant leakage at SQL layer requires join policies.
3. **Cookie absent**: API guard allows header-only tenant UUID when cookie missing — tighten with mandatory session for production.
