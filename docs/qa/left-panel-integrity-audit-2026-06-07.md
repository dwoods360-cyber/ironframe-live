# Left-Rail Integrity Audit — 2026-06-07

**Scope:** `IrontechLeftPaneControls` → `ControlRoom` → `StrategicIntel` → `WorkforceShowcaseGrid` → `SentinelSweepModal` (+ `Auditor View` alternate mode).  
**Canonical index:** 0–32 (`app/config/leftPanelFeatureIndex.ts`, `docs/qa/left-panel-functional-index.md`).  
**LP tag convention:** `LP-{id+1}` (e.g. index **14** = **LP-15** Review Queue).

---

## Phase 1 — Automated checks

### Vitest baseline (zero-regression)

| Suite | Result |
|-------|--------|
| `tests/unit/intelligenceStreamFormat.test.ts` | **PASS** (3/3) |
| `tests/unit/secureTerminalGate.test.ts` | **PASS** (5/5) |
| `tests/unit/workforceShowcaseTelemetry.test.ts` | **PASS** (6/6) |
| `tests/unit/sentinelInstructionGate.test.ts` | **PASS** (5/5) |
| `tests/unit/hitlReviewQueue.test.ts` | **PASS** (2/2) |
| `tests/unit/useAgentStore.test.ts` | **PASS** (3/3) |

**Total:** 24/24 tests passed.

### Tenant sandbox path trace (Prisma / cookies)

| Consumer | Isolation hook | Verdict |
|----------|----------------|---------|
| `listPendingThreatResolutions` / `approveThreatResolution` / `rejectThreatResolution` | `getScopedTenantUuidFromCookies()` + `actorMayReviewHitlApproval` | **PASS** |
| `runSentinelSweepReadinessAction` | `getCompanyIdForActiveTenant()` → `company.tenantId` scoped counts | **PASS** (read-only, no writes) |
| `pollResilienceIntelStreamLines` | `getCompanyIdsForActiveTenant()` OR-filter on `auditLog` joins | **PASS** |
| `purgeSimulation` / terminal `purg` | Server actions re-validate tenant via cookie-derived company | **PASS** |
| Supabase WORM buckets (`20260529154334_epic12_worm_evidence_locker_rls.sql`) | No UPDATE/DELETE policies (append-only) | **PASS** (storage layer; left rail does not bypass) |

Left-rail React surfaces **do not** import Prisma directly; all DB touchpoints route through server actions with cookie-derived tenant scope.

---

## Phase 2 — High-risk manual path verification

### LP-15 (index 14) — Review Queue (HITL)

**Path:** `ControlRoom.handleReviewAction` → `approveThreatResolution` / `rejectThreatResolution` → `addStreamMessage(formatAgentIntelLine(...))` → `listPendingThreatResolutions(tenantScope)`.

| Check | Outcome |
|-------|---------|
| Stream notification after successful decision | **PASS** — `addStreamMessage` is synchronous Zustand `set()`; does not block React reconciliation |
| Emission ordering | **PASS** — tracking line emitted only after server confirms success (fail-closed) |
| Tenant scope on queue fetch | **PASS** — `activeTenantUuid` passed to `listPendingThreatResolutions` |
| BigInt ALE math in HITL utils | **PASS** — `hitlReviewQueue.test.ts` asserts `readOnlyTenantBaselineAleCents` uses `1_110_000_000n` without float drift |

### LP-29 (index 28) — Secure Terminal

**Path:** `StrategicIntel.handleTerminalCommand` → `parseSecureTerminalMacro` → `IRONGATE_MALFORMED_REJECTION` / `formatIrongateTerminalRejection`.

| Payload | Outcome |
|---------|---------|
| `kimbot; rm -rf /` | **REJECTED** (`reason: escape`) |
| `kimbot && curl evil` | **REJECTED** |
| `kimbot \| sh` | **REJECTED** |
| `$()` / multi-token abuse | **REJECTED** via `containsIngressShellEscapeVector` |
| Valid `kimbot` without tenant | **REJECTED** — `formatTenantIsolationFault()` |
| Stream stamp | **PASS** — `[AGENT-14:IRONGATE] [REJECTED]` per `secureTerminalGate.test.ts` |

### LP-31 & LP-32 (index 30 & 31) — Sentinel instruction + modal

| Check | Outcome |
|-------|---------|
| Orange button disabled on empty / whitespace | **PASS** — `canRunSentinelSweep` requires `parseSentinelAgentInstruction(...).ok` + verified tenant UUID |
| Modal opens → immediate readiness sweep | **PASS** — `SentinelSweepModal` `useEffect` calls `runSentinelSweep(instr)` on mount when instruction non-empty |
| Read-only server action | **PASS** — `runSentinelSweepReadinessAction` performs counts only; no `ale_baseline` / threat writes |
| Ironsight completion line | **PASS** — `agentStore.runSentinelSweep` appends `AGENT-08:IRONSIGHT` readiness summary |

### LP-26 (index 25) — Active Agents showcase

| Check | Outcome |
|-------|---------|
| Status transitions HEALTHY / BURDENED / HIGH THROUGHPUT | **PASS** — `computeShowcaseAgentStatus` + `workforceShowcaseTelemetry.test.ts` |
| `agentRiskStore` input | **PASS** — `buildShowcaseAgentTelemetry` reads `agentRiskByIndex` |
| Tenant-switch stream cold-boot | **PASS** — `TenantSwitcher` → `purgeClientTenantScopeAfterSwitch` → `resetAgentStreamsForPurge` restores `INITIAL_MESSAGES` (`> [SYSTEM] …`) |
| Tenant-switch risk overlay drift | **REMEDIATED** — `resetForTenantScopeChange()` added to `resetAllStores` (see below) |

---

## Phase 3 — Comprehensive status table

| ID | LP | Feature | Verdict | Notes |
|----|-----|---------|---------|-------|
| 0 | LP-01 | CONTROL ROOM header | **PASS** | Status dot + title render |
| 1 | LP-02 | Quick nav links | **PASS** | `LEFT_PANE_NAV` static routes |
| 2 | LP-03 | Chaos Meter | **PASS** | Drill run/defeated + stream heuristic |
| 3 | LP-04 | Identity toggle | **PASS** | ADMIN/CISO handshake cookie |
| 4 | LP-05 | Compliance overlay | **PASS** | `complianceOverlayStore` |
| 5 | LP-06 | Automated updates | **PASS** | Toggle + channel count |
| 6 | LP-07 | Audit Verified badge | **PASS** | Notification config session |
| 7 | LP-08 | THREATS_RESOLVED tag | **PASS** | `AgentKillsInlineTag` |
| 8 | LP-09 | Manage Endpoints modal | **PASS** | Modal + tenant context |
| 9 | LP-10 | Config churn widget | **PASS** | `ConfigChangeWidget` tenant refresh |
| 10 | LP-11 | Agent Status Pulse | **PASS** | 19-agent pill grid + LIVE clock |
| 11 | LP-12 | Pulse gestures | **PASS** | Single/double/right-click handlers |
| 12 | LP-13 | Workforce overlay | **PASS** | 19-agent modal roster |
| 13 | LP-14 | Agent Log Inspector | **PASS** | Right-rail stream slice |
| 14 | LP-15 | Review Queue (HITL) | **PASS** | Tenant-scoped approve/reject + stream line |
| 15 | LP-16 | Meta-Audit Console | **PASS** | RBAC-gated export/verify |
| 16 | LP-17 | Simulation Bots A–D | **CAVEAT** | Visible only when simulation mode enabled |
| 17 | LP-18 | Chaos Deploy embed | **CAVEAT** | Embedded only in simulation mode |
| 18 | LP-19 | Strategic Status bar | **PASS** | STABLE / sim count / timer |
| 19 | LP-20 | Ironwatch sidebar alert | **PASS** | Dismissible governance banner |
| 20 | LP-21 | Strategic Intel header | **CAVEAT** | Static “Healthy” label (cosmetic; not live-derived) |
| 21 | LP-22 | Industry Profile | **PASS** | Sector select + CMMC badge |
| 22 | LP-23 | Risk Exposure | **PASS** | GRC-Gold pivot + trend chart |
| 23 | LP-24 | Analyst Maturation | **PASS** | Tenant-scoped maturation bar |
| 24 | LP-25 | Threat library | **PASS** | Drill launch + deep-dive modal |
| 25 | LP-26 | Active Agents showcase | **PASS** | Post-remediation tenant isolation |
| 26 | LP-27 | Live Intelligence Stream | **PASS** | Expert Mode–gated terminal view |
| 27 | LP-28 | Expert Mode coupling | **PASS** | Header toggle → `useResilienceIntelPoll` |
| 28 | LP-29 | Secure Terminal | **PASS** | Irongate macro gate + rejection stamp |
| 29 | LP-30 | TTL controls | **PASS** | Hours stepper + SET + countdown |
| 30 | LP-31 | Sentinel instruction + RUN | **PASS** | Disabled on empty; opens modal |
| 31 | LP-32 | SentinelSweepModal | **PASS** | Auto readiness sweep on open |
| 32 | LP-33 | Auditor View left panel | **PASS** | Replaces Control Room + Strategic Intel |

**Summary:** 29 PASS · 3 CAVEAT · 0 FAIL

---

## Identified drift / regressions

| Issue | Severity | Status |
|-------|----------|--------|
| `agentRiskStore` not cleared on tenant switch — stale `byIndex` could tint showcase BURDENED state | Medium | **FIXED** in this audit |
| `telemetryTenantScope` retained across `resetAgentStreamsForPurge` | Low | **FIXED** — nulled on cold-boot |
| Strategic Intel header hardcoded “Healthy” | Cosmetic | Open (display-only) |
| Simulation-only features hidden outside sim mode | By design | Documented as CAVEAT |
| Forensic audit buffer intentionally survives tenant switch | By design | `TenantProvider` comment; Master Purge only |

No dead execution loops, unrendered HITL queues, or cross-tenant Prisma leaks were found in left-rail paths.

---

## Remediation applied (this session)

### 1. Clear Ironwatch risk overlay on tenant switch

`app/store/agentRiskStore.ts` — `resetForTenantScopeChange()`  
`app/store/resetAllStores.ts` — invoke on cold-boot

### 2. Null telemetry scope on stream purge

`app/store/agentStore.ts` — `resetAgentStreamsForPurge` sets `telemetryTenantScope: null`

---

## TAS alignment sign-off

| Asset (whole-cent BigInt) | Left-rail mutation authority |
|---------------------------|------------------------------|
| Medshield `1_110_000_000¢` | **None** — HITL utils read-only; no client writes |
| Vaultbank `590_000_000¢` | **None** |
| Gridcore `470_000_000¢` | **None** |

- Sentinel sweep readiness action: **read-only** Prisma counts; explicitly no `ale_baseline` mutation.
- Secure terminal `purg`: tenant-scoped simulation purge only; does not alter authoritative ledger baselines.
- Review Queue approve/reject: server-side `threatApproval` workflow; financial cents handled in server actions with BigInt guards (see `hitlReviewQueue.test.ts`).

**Certification:** Left-rail UI matrices have **no direct mutation path** over pure BigInt whole-cent accounting anchors. All financial writes remain behind server actions with cookie-derived tenant scope.

---

*Audit executed: 2026-06-07 · Vitest 24/24 · Reviewer: automated + static path trace*
