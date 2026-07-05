# BWC Wil Production Smoke — Design Partner Sign-Off

**Tenant:** The Blackwoods Coffee Co. (`bwc`)  
**Operator:** `wil@blackwoodscoffee.com` (`GRC_MANAGER`)  
**Purpose:** Prove a flesh-and-blood design partner can complete the core cockpit loop on a **deployed** build — not only on local `bwc.lvh.me`. This is the partner-validation gate after [Golden Path](golden-path-checklist.md) airworthiness (Runs 2–4).

**Automation mirror:** `tests/e2e/bwcWilSmoke.spec.ts` (local dev; same paths and pass signals).

---

## Pass bar

One **clean incognito session** on the **BWC tenant host** (not apex `localhost`) with:

- No billing hold while `tenant_billing.status` is **ACTIVE**
- No IRONGUARD / “FETCH BLOCKED: NO TENANT CONTEXT” errors
- No login redirect loop after authentication
- Ironquery CSV download named `ironquery-analyst-export-bwc.csv` (not `feature8_tabular_ledger_export_*`)

Record date, environment, deploy SHA, and pass/fail in the run log at the bottom.

---

## Stop 0 — Environment prerequisites

| Requirement | Notes |
|-------------|--------|
| Deploy | Production or staging build promoted from `main` (post PR #12 exports/Ironguard fixes, PR #13 logout, PR #14 loading UX, PR #15 e2e stability) |
| Database | Same Supabase/Postgres project as provisioned BWC tenant |
| BWC tenant row | Slug `bwc`; operator invite **CONSUMED**; role **GRC_MANAGER** assigned |
| Billing | `tenant_billing.status` = **ACTIVE** for slug `bwc` |
| ALE baseline | Tenant `ale_baseline` saved (required for `/exports`; otherwise scope gate on `/exports`) |
| Browser | **Incognito** or fresh profile — no stale `ironframe-tenant` cookie from Golden Path slugs |
| Host | **Tenant subdomain only** — Wil must not smoke on apex `localhost` for BWC sign-off |

### Host matrix

| Environment | Login URL | Notes |
|-------------|-----------|--------|
| **Local dev** | `http://bwc.lvh.me:3000/login` | Authoritative pre-promote smoke; `npm run dev` at repo root |
| **Production (target)** | `https://bwc.{apex}/login` | `{apex}` = `IRONFRAME_TENANT_APEX_DOMAIN` or `NEXT_PUBLIC_APP_URL` hostname (e.g. `ironframegrc.com`) |
| **Vercel interim** | `https://ironframe-live.vercel.app/login` | Bare apex only; deployment protection may require Vercel share/auth. **Tenant subdomain on `*.vercel.app` is not the design-partner target** — use custom apex + wildcard DNS when available |

**Switcher note:** `bwc` is hidden from the apex tenant switcher until `IRONFRAME_ENABLE_BWC_STAGING=1`. Wil should bookmark the **tenant host**, not rely on switching from Global Command Center.

### Pre-flight DB checks (optional)

```powershell
npx tsx -r ./scripts/preload-local-env.cjs scripts/dev/check-wil-bwc-state.ts
npx tsx -r ./scripts/preload-local-env.cjs scripts/dev/check-wil-bwc-rbac.ts
```

Expect: invite **CONSUMED**, billing **ACTIVE**, `GRC_MANAGER` on `bwc`.

---

## Stop 1 — Login

| Field | Value |
|-------|--------|
| **Path** | `https://bwc.{apex}/login` (or `http://bwc.lvh.me:3000/login` locally) |
| **Action** | Sign in with `wil@blackwoodscoffee.com` + operator password |
| **Target outcome** | Authenticated session on **tenant host** (`bwc.*`), not apex `/integrity` detour |
| **Pass** | URL stays on `bwc.*`; no “Workspace access paused” panel |

---

## Stop 2 — Command Post

| Field | Value |
|-------|--------|
| **Path** | `/` |
| **Action** | Land after login or navigate via top nav **COMMAND POST** |
| **Target outcome** | Dashboard main shell loads (`data-testid="dashboard-main"`) |
| **Pass** | No perpetual “Synchronizing workspace ledger”; left rail becomes interactive within ~90s on cold start |
| **Fail signals** | Redirect to `/login`; billing hold; `FETCH BLOCKED: NO TENANT CONTEXT` |

---

## Stop 3 — Get Started (onboarding state)

| Field | Value |
|-------|--------|
| **Path** | `/get-started` |
| **Action** | Open from top nav **GET STARTED**; confirm checklist / portal loads |
| **Target outcome** | `.ironframe-get-started-portal` visible; ALE + company profile already saved for Wil (completed 2026-07-03) |
| **Pass** | No amber ALE gate blocking export path; orientation portal usable |
| **Fail signals** | Flash to Command Post then back; apex host in URL |

---

## Stop 4 — Integrity Hub

| Field | Value |
|-------|--------|
| **Path** | `/integrity` |
| **Action** | Top nav **INTEGRITY HUB** (2nd chip) |
| **Target outcome** | Hub loads on tenant host; tripane scrolls; no viewport lock |
| **Pass** | URL contains `/integrity` on `bwc.*`; no re-login bounce |
| **Fail signals** | Stuck “Loading Integrity Hub” >2 min with no content; Ironlock overlay blocking navigation |

**Timing note:** First load may wait ~15s on `GET /api/grc/governance-maturity?recalc=1` — expected on cold recalc, not a fail by itself.

---

## Stop 5 — Ironquery export

| Field | Value |
|-------|--------|
| **Path** | `/exports` |
| **Action** | Navigate directly or click **Analyst exports** from Command Post left rail (`data-testid="analyst-exports-link"`) |
| **Target outcome** | Analyst Export Console **or** explicit scope gate panel on `/exports` (not silent redirect to `/`) |
| **Pass** | Stays on `bwc.*/exports`; trigger CSV download |
| **Fail signals** | Redirect to `/?exportScope=required`; `feature8_tabular_ledger_export_*` filename; bounce to apex `/login` |

### CSV contract (9 columns)

Download must be named **`ironquery-analyst-export-bwc.csv`**.

Header row (exact order):

```text
tenantId,tenantKey,aleBaselineCents,rateUsdPerUnit,unitType,source,jurisdiction,polledAt,generatedAt
```

| Column | Expectation |
|--------|-------------|
| `tenantKey` | `bwc` |
| `aleBaselineCents` | Whole integer string (BigInt cents), no floats |
| `unitType` | `kWh` |
| `rateUsdPerUnit` | Positive finite number |

Reference implementation: `app/utils/ironquery/csvEncoder.ts`.

---

## Stop 6 — Session logout

| Field | Value |
|-------|--------|
| **Path** | Any authenticated dashboard route |
| **Action** | Top nav → user menu → **Log Out** |
| **Target outcome** | Hard redirect to `/login` on **same host** (`bwc.*`); session and `ironframe-tenant` cookie cleared |
| **Pass** | Back button does not restore Command Post without re-login |
| **Implementation** | `performClientSessionLogout()` — merged PR #13 |

---

## Fail signals (quick reference)

| Symptom | Likely cause |
|---------|----------------|
| 403 on `/api/dashboard` or `/api/threats/active` | Missing `GRC_MANAGER` assignment on `bwc` |
| Billing hold panel | `tenant_billing` not **ACTIVE** |
| Export scope gate / `?exportScope=required` | ALE baseline not saved on tenant |
| Analyst exports → `localhost/login` | Dev host binding bug (fixed PR #12 — retest on current build) |
| Many `GET /login` in server log while Wil navigates | Parallel Golden Path / admin activity — isolate incognito Wil session |

---

## Automated smoke (local only)

Requires `DATABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, dev server on `:3000`, billing **ACTIVE** for `bwc`.

```powershell
npx playwright test tests/e2e/bwcWilSmoke.spec.ts --workers=1
```

Optional operator override: `E2E_BWC_OPERATOR_EMAIL=wil@blackwoodscoffee.com`.

Diagnostic JSON is printed to the terminal (`=== BWC WIL SMOKE DIAGNOSTIC ===`).

---

## Run log

| Run | Date | Environment | Deploy SHA | Operator | Stops 1–6 | Notes |
|-----|------|-------------|------------|----------|-----------|-------|
| Local Playwright | 2026-07-04 | `bwc.lvh.me:3000` | pre–PR #15 | automation | ☑ | Command Post, `/exports` on tenant host, no login loop; tenant cookie bound |
| Production manual | 2026-07-05 | `bwc.ironframegrc.com` | `fab5b984` (PR #15) | Wil | ☑ | Tester: Dereck. Incognito on tenant host; Stops 5a–5c (`/exports` direct, Analyst exports nav, `ironquery-analyst-export-bwc.csv` BigInt cents + Pure Units); Stop 6 logout → `/login`, session intercepted. **Design partner sign-off — PASS.** |

---

## Related code

| Area | Paths |
|------|--------|
| Playwright smoke | `tests/e2e/bwcWilSmoke.spec.ts` |
| Golden Path (synthetic) | `docs/ops/golden-path-checklist.md` |
| Exports route | `app/(dashboard)/exports/`, `app/actions/ironqueryExportActions.ts` |
| Logout | `app/lib/auth/performClientSessionLogout.ts` |
| Tenant host middleware | `middleware.ts`, `app/lib/tenantSubdomain.ts` |
| Ironguard gate | `app/lib/security/tenantMembershipGuard.ts` |
