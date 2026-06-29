# Golden Path Demo Checklist — Design Partner Airworthiness

**Branch baseline:** `feature/epic17-ironbloom-billing`  
**Stabilization commits:** `fix(ui): integrity hub routing…`, `fix(ironboard): GTM market research routing…`  
**Purpose:** Prove the cockpit is stable for design-partner demos before expanding Epic 17 scope.

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

---

## Stop 1 — Admin provision

| Field | Value |
|-------|--------|
| **Path** | `/admin/onboarding` |
| **Action** | Execute **Quick provision — tenant + activation invite** (`quickProvisionCorporateWorkspaceAction`) |
| **Target outcome** | New tenant row created; registration token logged (terminal, invite email, or dev handoff UI) |
| **Pass** | No Prisma/validation error; invite URL contains `/register/{token}` |

---

## Stop 2 — Activation gate

| Field | Value |
|-------|--------|
| **Path** | `/register/{token}` |
| **Action** | Open invite in **incognito**; complete MSA/DPA + password registration |
| **Target outcome** | `user_legal_consent` persisted; session bootstrap; redirect to tenant workspace or `/get-started` |
| **Pass** | Authenticated session on intended host (subdomain or apex) without `/unauthorized` |

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

## Stop 5 — Executive export

| Field | Value |
|-------|--------|
| **Path** | `/dashboard/exports` |
| **Action** | Trigger an **Ironquery** analytical export (CSV/PDF per entitled tier) |
| **Target outcome** | Download or generation completes with tenant-scoped data |
| **Pass** | Export succeeds for entitled tenant; framework crosswalk fields present where documented for tier |

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
| 1 | | | ☐ | ☐ | |
| 2 | | | ☐ | ☐ | |
| 3 | | | ☐ | ☐ | |

---

## Related code

| Area | Paths |
|------|--------|
| Quick provision | `app/actions/admin/quickProvisionCorporateWorkspace.ts`, `app/lib/server/quickProvisionCorporateWorkspaceCore.ts` |
| Registration | `app/register/[token]/`, `app/actions/register/activateWorkspaceInvitation.ts` |
| Get Started | `app/(dashboard)/get-started/` |
| Integrity hub | `app/(dashboard)/integrity/`, `app/components/HeaderTwo.tsx` |
| Billing gate | `app/components/billing/DashboardBillingGate.tsx` |
| Exports | `app/dashboard/exports/` |
| IronBoard GTM | `Ironboard/src/index.ts`, `Ironboard/src/services/boardroomQueryIntent.ts` |
