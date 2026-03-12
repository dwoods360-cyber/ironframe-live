# Targeted Blast Radius Audit — IRONTRUST Financials (GATEKEEPER PROTOCOL)

**Scope:** Scale Selector + Live Financial Aggregation on Risk Ops Dashboard.  
**Mode:** Read-only. No code changes.

---

## 1. Financial Data Flow — File Map

### 1.1 Prisma schema (risk/loss as BigInt)

| File | Role | Current state |
|------|------|----------------|
| `prisma/schema.prisma` | Defines `Company.industry_avg_loss_cents`, `Company.infrastructure_val_cents` (BigInt?); `ActiveRisk.score_cents` (BigInt); `ThreatEvent.financialRisk_cents` (BigInt); `Tenant.ale_baseline` (BigInt). | **Ready** — All financial fields are BigInt (cents). |

---

### 1.2 API routes (dashboard data)

| File | Role | Current state |
|------|------|----------------|
| `app/api/dashboard/route.ts` | GET /api/dashboard: tenant-scoped companies, active_risks (score_cents), threatEvents. Serializes companies and risks to JSON. | **Needs refactor** — Serialization converts BigInt → Number: `score_cents: Number(risk.score_cents)`, `industry_avg_loss_cents: ... Number(...)`, `infrastructure_val_cents: ... Number(...)`. Safe for typical GRC scale (e.g. &lt; $10B) but **TAS violation** for values beyond `Number.MAX_SAFE_INTEGER`; prefer string or BigInt-safe serialization for future scale. |

---

### 1.3 Zustand store (financial totals & scale)

| File | Role | Current state |
|------|------|----------------|
| `app/store/riskStore.ts` | Holds `acceptedThreatImpacts` ($M per threat), `dashboardLiabilities`, `riskOffset`, `currencyMagnitude` / `currencyScale` (AUTO | K | M | B | T), `setCurrencyMagnitude` / `setCurrencyScale`. Pipeline/active threats use `loss` and `score` as numbers ($M). | **Ready** — Scale selector state and financial aggregates live here. No BigInt in store; API/DB cents converted to number at boundary (acceptable for current scale). |

---

### 1.4 UI — Left sidebar (Current Risk / GRC Gap) & Scale Selector

| File | Role | Current state |
|------|------|----------------|
| `app/components/StrategicIntel.tsx` | Left sidebar: “YOUR CURRENT RISK”, “POTENTIAL IMPACT”, “GRC GAP”. Uses `acceptedThreatImpacts`, `pipelineThreats`, `currencyMagnitude`, `formatRiskExposure`. Two parallel aggregates: (1) `exactTotalCurrentRisk` from `acceptedThreatImpacts`; (2) `totalRiskMillions` from `pipelineThreats.reduce(..., loss ?? score)`. Bar labels use `totalRiskMillions`; trend chart uses `dynamicCurrentRisk` (from accepted + pipeline). **GRC Gap** = `getIndustryMetrics(selectedIndustry).grc` — **hardcoded** strings ($4.3M, $5.1M, etc.). | **Needs refactor** — (1) **Dead/duplicate logic:** Two different “current risk” definitions (accepted sum vs pipeline sum); bar display uses pipeline-only sum, so “Current Risk” label may not match accepted-only semantics. (2) **Mocked static:** `getIndustryMetrics()` returns fixed `$8.5M` / `$4.3M` etc.; GRC Gap is not live. |
| `app/components/TopNav.tsx` | Scale Selector (AUTO, K, M, B, T): reads `currencyScale`, calls `setCurrencyScale(scale)`. | **Ready** — Wired to riskStore; no financial math. |
| `app/components/ExecutiveSummary.tsx` | Uses `currencyMagnitude`, `formatRiskExposure(adjustedLiabilityExposureUsd, currencyMagnitude)` for baseline/current/mitigated. Aggregates from `acceptedThreatImpacts`, `pipelineThreats`, `totalMitigatedRiskM`. | **Ready** — Uses scale and formatting correctly. |
| `app/components/LiabilityExposureDisplay.tsx` | Single liability display: `formatRiskExposure(totalUsd, currencyMagnitude)`. | **Ready** — Thin wrapper over store + riskFormatting. |
| `app/components/DashboardAlertBanners.tsx` | Regulatory alerts; shows `formatRiskExposure(alert.liabilityM * 1_000_000, currencyMagnitude)` per alert. | **Ready** — Scale-aware display. |
| `app/components/ExecutiveSummary.tsx` (line 130) | Label “Current Risk” in UI. | **Ready** — Display only. |

**Note:** No separate `Left_Sidebar.tsx`; left-side content is in `StrategicIntel.tsx`.

---

### 1.5 Irontrust math utilities

| File | Role | Current state |
|------|------|----------------|
| `core/irontrust/ale-engine.ts` | `calculateRiskLevel(aleCents: bigint, thresholdCents: bigint)` → CRITICAL | ELEVATED | ACCEPTABLE. Uses BigInt only; throws on negative/zero threshold. | **Ready** — BigInt-native; no Number/Float. |
| `app/utils/riskFormatting.ts` | `formatRiskExposure(value: number, scale: CurrencyMagnitude)` → string (e.g. `"5.0M"`). Input `value` in **dollars** (not cents). AUTO picks K/M/B/T by magnitude. | **Ready** — Input is number (dollars); scale selector drives display. No BigInt in this file (accepts already-converted number). |

---

## 2. Vulnerabilities & Dead Code (within above files only)

| Location | Issue | Severity |
|----------|--------|----------|
| `app/api/dashboard/route.ts` (lines 78, 86–87) | BigInt → Number serialization for `score_cents`, `industry_avg_loss_cents`, `infrastructure_val_cents`. Precision loss for values &gt; 2^53 − 1. | **TAS violation** (use BigInt-safe serialization for currency). |
| `app/components/StrategicIntel.tsx` (lines 579–587) | `getIndustryMetrics(selectedIndustry)` returns **hardcoded** `$8.5M`, `$4.3M`, etc. GRC Gap is not driven by live data. | **Mocked static** — Refactor when wiring live financial aggregation. |
| `app/components/StrategicIntel.tsx` (lines 527–529 vs 591–594) | Two “current risk” aggregates: `exactTotalCurrentRisk` (accepted) and `totalRiskMillions` (pipeline). Bar labels use `totalRiskMillions`; chart uses `dynamicCurrentRisk`. Risk of confusion or inconsistency. | **Dead/duplicate logic** — Clarify single source of truth for “Current Risk” (accepted vs pipeline vs both). |
| `app/store/riskStore.ts` | `PipelineThreat.loss` and `score` are `number` ($M). No unused variables in the listed slice; store is consistent. | — |
| `app/utils/riskFormatting.ts` | No unused variables; no currency in Float/Number violation (input is already dollar number). | — |
| `core/irontrust/ale-engine.ts` | No dead code; BigInt-only. | — |

---

## 3. Test Coverage Mapping

| Component / utility | Test file(s) | What’s covered |
|---------------------|--------------|----------------|
| **GET /api/dashboard** (tenant isolation, payload shape) | `tests/integration/dashboard.test.ts` | 401 without tenant; 401 empty x-tenant-id; 200 with Vaultbank context, companies/risks shape, no cross-tenant bleed. Prisma mock includes `$transaction`. |
| **Dashboard E2E** (shell, layout) | `tests/e2e/dashboard.spec.ts` | Dashboard main visible, GRC gate / drawer behavior. |
| **Dashboard load / pipeline** | `tests/e2e/stage1-validation.spec.ts`, `tests/e2e/stage1-validation-simplified.spec.ts`, `tests/e2e/threatPipeline.spec.ts` | Dashboard-main wait, pipeline/registration flows (some tests skipped). |
| **ALE engine (BigInt risk levels)** | `core/irontrust/ale-engine.test.ts` | Baselines (Medshield, Vaultbank, Gridcore), boundaries, financial guardrails (negative/zero), monotonic invariant. |
| **riskFormatting.ts** | — | **No dedicated unit tests.** |
| **riskStore (currency scale, financial aggregates)** | — | **No dedicated unit tests.** Only indirect coverage via E2E. |
| **StrategicIntel / ExecutiveSummary (scale selector + formatRiskExposure)** | — | **No unit tests**; only E2E that hit dashboard. |

---

## 4. Terminal commands to test this logic before changes

Run these before implementing Scale Selector + Financial Aggregation:

```bash
# Dashboard API (tenant isolation, payload shape, serialization)
npx vitest run tests/integration/dashboard.test.ts

# ALE engine (BigInt risk level math)
npx vitest run core/irontrust/ale-engine.test.ts

# E2E: dashboard shell + pipeline (chromium only)
npx playwright test tests/e2e/dashboard.spec.ts --project=chromium

# Optional: full E2E suite for dashboard/pipeline (includes skipped tests)
npx playwright test tests/e2e/dashboard.spec.ts tests/e2e/threatPipeline.spec.ts tests/e2e/stage1-validation.spec.ts tests/e2e/stage1-validation-simplified.spec.ts --project=chromium
```

**Recommended before wiring live aggregation:** Add unit tests for:

- `app/utils/riskFormatting.ts` — `formatRiskExposure(value, scale)` for AUTO/K/M/B/T and edge cases.
- `app/store/riskStore.ts` — `setCurrencyMagnitude` / `setCurrencyScale` and any financial aggregate used by the new feature.

---

## 5. TAS COMPLIANCE CHECK

| Directive | Status |
|-----------|--------|
| Trace financial data flow | Done — Prisma (BigInt), dashboard API, riskStore, StrategicIntel/TopNav/ExecutiveSummary/LiabilityExposureDisplay/DashboardAlertBanners, ale-engine, riskFormatting. |
| Prisma schema (risk/loss BigInt) | Done — Documented; all relevant fields are BigInt. |
| API routes (dashboard) | Done — `app/api/dashboard/route.ts`; BigInt→Number serialization flagged. |
| Zustand store (financial totals) | Done — `app/store/riskStore.ts`; scale + aggregates documented. |
| UI: Left sidebar (Current Risk / GRC Gap) | Done — `StrategicIntel.tsx`; duplicate logic and hardcoded GRC Gap flagged. |
| UI: Scale Selector (AUTO/K/M/B/T) | Done — `TopNav.tsx`; wired to riskStore. |
| Irontrust math (ale-engine) | Done — `core/irontrust/ale-engine.ts`; BigInt-only. |
| Identify vulnerabilities & dead code | Done — Within listed files: TAS (BigInt→Number), mocked GRC Gap, two “current risk” definitions. |
| Test coverage mapping | Done — dashboard.test.ts, ale-engine.test.ts, E2E specs; riskFormatting and riskStore untested. |
| Exact terminal commands | Done — Listed in §4. |

**Result:** Audit complete. Dashboard API serialization and StrategicIntel GRC Gap/current-risk logic are the main refactor targets before wiring Scale Selector and live Financial Aggregation.
