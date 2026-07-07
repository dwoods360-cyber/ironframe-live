# Golden Path Demo Checklist — Design Partner Airworthiness

**Branch baseline:** `feature/epic17-ironbloom-billing`  
**Stabilization commits:** `fix(ui): integrity hub routing…`, `fix(ironboard): GTM market research routing…`  
**Purpose:** Prove the cockpit is stable for design-partner demos before expanding Epic 17 scope.

**GTM context:** [Market Entrance Playbook](../sales/market-entrance-playbook.md) — beachhead, 4-agent rhythm, 90-day milestones.

**Partner validation (post–3× bar):** [BWC Wil production smoke](bwc-wil-production-smoke.md) — live operator sign-off on tenant host `bwc` (**PASS** 2026-07-05).

---

## Pass bar

Run the full sequence below **three consecutive times** on local dev with **zero** manual database fixes, layout freezes, unexpected 403s, or billing dead-ends.

Record date, operator, and pass/fail per run in the table at the bottom.

---

## Stop 0 — Environment prerequisites

| Requirement | Notes |
|-------------|--------|
| Next.js app | `npm run dev` → `http://127.0.0.1:3000` or `http://{tenant}.lvh.me:3000` |
| IronBoard (if board in demo) | `cd Ironboard && npm run dev` → `http://127.0.0.1:8082` |
| Database | Local or staging Supabase with migrations applied |
| Operator session | **GLOBAL_ADMIN** for Stop 1 |
| IronBoard API key | `GOOGLE_API_KEY` in `Ironboard/.env.local` when testing GTM / market research on board |
| Host | Prefer **localhost / lvh.me** — cloud hosts may quarantine private workspace routes without `IRONFRAME_ALLOW_PUBLIC_INGRESS=1` |
| Session hygiene | **Incognito** for Stop 2; clear stale `ironframe-tenant` cookie or use a **fresh slug** — do not reuse `abc co` from Run #1 |
| Billing before Stop 5 | Quick provision seeds `tenant_billing` as **PENDING**; flip to **ACTIVE** for design-partner export pass (Stop 5) |

---

## Run #2 prep (2026-06-30)

Use this sequence after revocation / API membership hardening landed in code:

1. **Purge or abandon** prior test slugs (`abc co`, `bwc` if re-testing) — `npx tsx scripts/purge-onboarding-test-records.ts --slug {slug} --execute` when needed.
2. **Stop 0** — `npm run dev` at repo root (`:3000`). IronBoard only if running Stop 6 (`cd Ironboard && npm run dev` → `:8082`).
3. **Stop 1** — Quick provision a **new** workspace slug at `/admin/onboarding`.
4. **Stop 2** — Incognito activation at `http://{slug}.lvh.me:3000/login?invite={token}` (existing operators) or `/register/{token}` (first-time password setup).
5. **Stop 3** — Complete ALE + company profile on `/get-started`.
6. **Before Stop 5** — Set `tenant_billing.status` to **ACTIVE** for that slug (design-partner waiver).
7. **Stop 4 + 4b** — Integrity Hub load, then optional revoke spot-check (4b).
8. **Stop 5** — `/exports` — expect `ironquery-analyst-export-{tenantKey}.csv`, not `feature8_tabular_ledger_export_*`.

---
## Stop 1 — Admin provision

| Field | Value |
|-------|--------|
| **Path** | `/admin/onboarding` |
| **Action** | Execute **Quick provision — tenant + activation invite** (`quickProvisionCorporateWorkspaceAction`) |
| **Target outcome** | New tenant row created; registration token logged (terminal, invite email, or dev handoff UI) |
| **Pass** | No Prisma/validation error; invite URL contains `/login?invite=` on tenant host |

---

## Stop 2 — Activation gate

| Field | Value |
|-------|--------|
| **Path** | `http://{slug}.lvh.me:3000/login?invite={token}` (tenant host — **not** `localhost`) |
| **Action** | Open invite in **incognito**; sign in with existing email/password (or use `/register/{token}` for first-time password setup) |
| **Target outcome** | `user_legal_consent` + role assignment persisted; redirect to `http://{slug}.lvh.me:3000/get-started?activation=1` **without** apex `/integrity` detour |
| **Pass** | Authenticated session on tenant subdomain; no manual login on apex `localhost` |

---

## Stop 3 — Funnel ingestion

| Field | Value |
|-------|--------|
| **Path** | `/get-started` |
| **Action** | Step 1: set whole-number **ALE baseline** (amber panel). Step 2: submit **primary company profile** (cyan panel). |
| **Target outcome** | Guided checklist unlocks; dashboard routes reachable |
| **Pass** | No perpetual `BILLING_HOLD` block on checklist unless tenant is intentionally `PENDING` — for golden path, tenant must be **ACTIVE** or billing-exempt per Epic 17 (`UNTRACKED` seed / admin provision path) |

**Billing note:** If `CommercialEntitlementHoldPanel` appears, resolve billing (`ACTIVE` on `tenant_billing`) before counting a pass.

---

## Stop 4 — Integrity triage

| Field | Value |
|-------|--------|
| **Path** | `/integrity` |
| **Action** | Navigate from header **INTEGRITY HUB** (2nd chip); use left-pane controls; view active threat / risk surfaces |
| **Target outcome** | No viewport lock or “page unresponsive”; Active Risks lifecycle updates without flooding re-renders |
| **Pass** | Hub loads; no Ironlock overlay blocking navigation from Command Post; tripane scrolls independently |

---

## Stop 4b — Revocation perimeter (post–Run #1 hardening)

Run once per Golden Path cycle after Stop 4, or on any build that touches RBAC / revoke.

| Field | Value |
|-------|--------|
| **Path** | `/admin/onboarding` → **Revoke operator access**; then browser DevTools → Network |
| **Action** | Revoke the activated operator for the **same** workspace slug. Without signing in again, attempt `GET /api/threats/active` and `GET /api/dashboard` (same stale `ironframe-tenant` cookie if still present). |
| **Target outcome** | **403** with workspace-access message; **no** threat row stream or dashboard payload |
| **Pass** | API returns 403; optional confirm global `signOut` forced re-login on next navigation |
| **Fail signals** | 200 JSON with tenant data after assignment row deleted; operator still polls Active Risks |

**Perimeter note (2026-06-30):** Tenant-scoped JSON routes use `assertAuthenticatedIronguardTenantOr403` (`app/lib/security/tenantMembershipGuard.ts`). Revoke path calls `revokeAllSupabaseSessionsForUser` (`signOut` global) in `revokeOperatorAccessCore.ts`.

---

## Stop 5 — Executive export

| Field | Value |
|-------|--------|
| **Path** | `/exports` |
| **Action** | Trigger an **Ironquery** analytical export (CSV/PDF per entitled tier) |
| **Target outcome** | Download or generation completes with tenant-scoped data |
| **Pass** | Export succeeds for entitled tenant; downloaded file is named `ironquery-analyst-export-{tenantKey}.csv` (not `feature8_tabular_ledger_export_*`); framework crosswalk fields present where documented for tier |
| **Fail signals** | Redirect to `/?exportScope=required` with client-side Feature 8 stub download; `CommercialEntitlementHoldPanel` on `/exports` while billing is `PENDING` |

**Perimeter note (2026-06-29):** `/exports` inherits `(dashboard)/layout.tsx` billing gate. Server actions call `assertTenantBillingActive` before compilation. Command Post home suppresses the legacy Feature 8 client export when a workspace session is active.

---

## Stop 6 — IronBoard GTM (optional)

Include when the design-partner pitch uses the executive boardroom.

| Field | Value |
|-------|--------|
| **Path** | `http://127.0.0.1:8082` |
| **Action** | Ask: *“Are you not able to perform real market research?”* (or regional prospect query with `activeHub` countries) |
| **Target outcome** | Affirmative execution receipt; `verifyAndOptimizeMarketData` / `queryLocalWorkspace` prefetch — **no** apology or “human operator must run batch loader” refusal |
| **Pass** | Deterministic capability answer or sanitized synthesis with market authenticity enrichment |

---

## Scope freeze mandate

Until this checklist passes **3× consecutively**, defer:

- Training corpus expansion  
- New async workforce / agent scripts  
- Additional documentation schema fields  
- Non-blocking UI polish  

**Allowed:** Fixes that directly unblock Stops 1–5 (and Stop 6 if board is in demo), plus billing activation required for Stop 3.

---

## Run log

| Run # | Date | Operator | Stops 1–5 | Stop 6 (optional) | Notes |
|-------|------|----------|-----------|-------------------|-------|
| 1 | 2026-06-29 | Dereck | FAIL | — | Stops 1–4 partial: `abc co` provisioned, ALE + profile saved, Integrity Hub OK. Stop 5 false positive: `feature8_tabular_ledger_export_*` from home-page client stub after `?exportScope=required` redirect; billing `PENDING`. Perimeter hardened post-run. |
| 2 | 2026-07-01 | Dereck | ☑ | ☑ | Stops 1–5 operator-verified; Stop 6 `golden-path-stop6-gtm.ts` PASS. |
| 3 | 2026-07-03 | Dereck | ☑ | — | Slug `run3b`; operator `tall360will@gmail.com`; incognito Stop 2 on tenant host; billing ACTIVE pre–Stop 5; Integrity Hub + Ironquery export verified. |
| 4 | — | Dereck | ☐ | ☐ | Fresh slug (e.g. `run4b`); incognito Stop 2; billing ACTIVE pre–Stop 5 — completes 3× consecutive pass bar with Runs 2–3. |

---

## Related code

| Area | Paths |
|------|--------|
| Quick provision | `app/actions/admin/quickProvisionCorporateWorkspace.ts`, `app/lib/server/quickProvisionCorporateWorkspaceCore.ts` |
| Registration | `app/register/[token]/`, `app/actions/register/activateWorkspaceInvitation.ts` |
| Get Started | `app/(dashboard)/get-started/` |
| Integrity hub | `app/(dashboard)/integrity/`, `app/components/HeaderTwo.tsx` |
| Billing gate | `app/components/billing/DashboardBillingGate.tsx` |
| Exports | `app/(dashboard)/exports/`, `app/actions/ironqueryExportActions.ts` |
| IronBoard GTM | `Ironboard/src/index.ts`, `Ironboard/src/services/boardroomQueryIntent.ts` |
| API membership gate | `app/lib/security/tenantMembershipGuard.ts`, `tests/architecture/tenantMembershipGuard.test.ts` |
| Operator revoke | `app/lib/server/revokeOperatorAccessCore.ts`, `app/lib/server/supabaseAuthAdminHelpers.ts` |
| BWC partner smoke | [bwc-wil-production-smoke.md](bwc-wil-production-smoke.md), `tests/e2e/bwcWilSmoke.spec.ts`, scheduled [production-bwc-smoke.yml](../../.github/workflows/production-bwc-smoke.yml) |
