# Pilot → Commercial Readiness Checklist

**Milestone:** `v0.1.0-ga-epic17` · **Posture:** sales-assisted invite + Stripe  
**Live tracker** — report each item as **PASS** or **FAIL**; this doc updates as you go.

**Companion docs:** [Golden Path](golden-path-checklist.md) · [BWC production smoke](bwc-wil-production-smoke.md) · [Epic 17 billing](../technical/epic17-billing-architecture.md) · [Market entrance playbook](../sales/market-entrance-playbook.md)

---

## How to report results

Reply with the **item ID** and **PASS** or **FAIL** (optional one-line note). Examples:

```text
PA-R4 PASS — slug run4b, Stops 1–5 clean
PA-SEC FAIL — ELECTRICITY_MAPS_API_KEY missing in Vercel prod
PB-LC PASS — subscription.updated → PAST_DUE verified on staging
```

| Result | Meaning |
|--------|---------|
| **PASS** | Verified; checkbox marked `[x]` |
| **FAIL** | Not met; checkbox stays `[ ]`; note recorded in evidence log |
| **—** | Not started |

---

## Status dashboard

_Last updated: 2026-07-07 (session start)_

### Phase A — Pilot-ready (Finish Line 1)

| ID | Pillar | Status | Notes |
|----|--------|--------|-------|
| **PA-R4** | Golden Path Run #4 (3× bar: Runs 2–4) | — | Runs 2–3 already PASS |
| **PA-SEC** | Ops secrets checklist green | — | PKI, crons, Electricity Maps, Stripe, ingress |
| **PA-BIL** | Billing activation automated (`PENDING` → `ACTIVE`) | — | No manual DB flip on export path |
| **FL1** | **Phase A exit — PILOT-READY** | — | Requires PA-R4 + PA-SEC + PA-BIL all PASS |

### Phase B — Commercial-ready (Finish Line 2)

| ID | Pillar | Status | Notes |
|----|--------|--------|-------|
| **PB-LC** | Stripe subscription lifecycle | — | `subscription.updated` / `deleted` → `PAST_DUE` / cancel |
| **PB-ENT** | Full entitlement matrix + routing | — | All `billing_gate: true` routes enforced |
| **PB-SKU** | Approved external pricing / SKU table | — | Publishable; matches entitlement rules |
| **PB-GTM** | Phase B GTM (2nd reference customer + in-tenant support) | — | Credibly support paid customers |
| **FL2** | **Phase B exit — COMMERCIAL-READY** | — | Requires all PB-* PASS |

### After commercial-ready (scope-freeze lift — not FL2)

| ID | Gate | Status | Notes |
|----|------|--------|-------|
| **GTM-3** | 3 paying design partners | — | Unlocks anti-roadmap scope expansion |

---

## Baseline complete (do not regress)

- [x] Golden Path Runs 2–3 — `golden-path-checklist.md`
- [x] BWC production smoke — 2026-07-05, `bwc-wil-production-smoke.md`
- [x] GLOBAL_ADMIN access — PR #43, production confirmed
- [x] Epic 17 billing foundation — webhooks, `DashboardBillingGate`, `/account/billing-hold`
- [x] Invite-only registration — `config/registration.ts`
- [x] Legal surfaces — `/terms`, `/privacy`
- [x] Admin quick provision — `/admin/onboarding`
- [x] Ingress worker secrets — Ironleads, SalesTeam, SuccessTeam on GitHub/Vercel/Cloud Run

---

# Phase A — Pilot-ready (Finish Line 1)

> **Exit criteria:** **PA-R4** + **PA-SEC** + **PA-BIL** all **PASS** → sign **FL1**.

---

## PA-R4 — Golden Path Run #4

**Target:** 3× consecutive bar satisfied (Runs 2–4).  
**Reference:** `docs/ops/golden-path-checklist.md`

| ID | Check | Status |
|----|-------|--------|
| PA-R4.0 | Stop 0 — env: dev server, DB migrated, GLOBAL_ADMIN, incognito profile | — |
| PA-R4.1 | Stop 1 — quick provision fresh slug (e.g. `run4b`) at `/admin/onboarding` | — |
| PA-R4.2 | Stop 2 — incognito activation on `http://{slug}.lvh.me:3000` | — |
| PA-R4.3 | Stop 3 — ALE + company profile on `/get-started` | — |
| PA-R4.4 | Stop 4 — `/integrity` loads; no viewport lock | — |
| PA-R4.4b | Stop 4b — revoke → API returns 403 | — |
| PA-R4.5 | Stop 5 — `/exports` → `ironquery-analyst-export-{tenantKey}.csv` | — |
| PA-R4.6 | Stop 6 (optional) — IronBoard GTM query | — |
| **PA-R4** | **Run #4 sign-off** — recorded in golden-path run log | — |

**Verify:** `npx vitest run tests/unit/ironqueryExportBillingGate.test.ts`

---

## PA-SEC — Ops secrets checklist green

**Target:** PKI keys, crons, Electricity Maps, Stripe, ingress — all confirmed working in production/staging.  
**Reference:** `docs/TIER_A_VERCEL_STAGING_CHECKLIST.md` · `docs/GA_OPEN_ROADMAP.md`

| ID | Check | Status |
|----|-------|--------|
| PA-SEC.1 | `DATABASE_URL` + `DIRECT_URL` (Supabase pooled + direct) | — |
| PA-SEC.2 | Supabase public keys + `SUPABASE_SERVICE_ROLE_KEY` + `NEXT_PUBLIC_APP_URL` | — |
| PA-SEC.3 | `IRONFRAME_CRON_SECRET` + `IRONFRAME_INTERNAL_GATES_SECRET` | — |
| PA-SEC.4 | `IRONFRAME_ALLOW_PUBLIC_INGRESS=1` or tenant-subdomain-only GTM documented | — |
| PA-SEC.5 | **PKI** — `PUBLIC_KEY_ID` + matching `PUBLIC_KEY_*` PEM in Vercel prod | — |
| PA-SEC.6 | **Crons** — `vercel.json` schedules; smoke `health-posture-triage` returns 200 | — |
| PA-SEC.7 | **Electricity Maps** — `ELECTRICITY_MAPS_API_KEY` in prod; live carbon data | — |
| PA-SEC.8 | `GOOGLE_API_KEY`, `RESEND_API_KEY`, `THREAT_CONFIRMATION_RECIPIENTS` | — |
| PA-SEC.9 | **Stripe** — dual webhook secrets; `NEXT_PUBLIC_STRIPE_COMMAND_TIER_CHECKOUT_URL` | — |
| PA-SEC.10 | Workforce ingress secrets (Ironleads, SalesTeam, SuccessTeam, SupportTeam) | — |
| PA-SEC.11 | GCP Cloud Run deploy green; secrets mirrored | — |
| PA-SEC.12 | `PRODUCTION_BWC_SMOKE_ENABLED=true` + scheduled smoke PASS (recommended) | — |
| **PA-SEC** | **Ops secrets sign-off** — all PA-SEC.* PASS | — |

**Verify:**

```bash
npx vitest run tests/integration/pki-verification.test.ts tests/integration/epic13-telemetry-triage.test.ts
curl -sS -X POST "$APP_URL/api/internal/cron/health-posture-triage" -H "Authorization: Bearer $IRONFRAME_CRON_SECRET"
```

---

## PA-BIL — Automate billing activation

**Target:** Remove manual `tenant_billing.status` flip from Golden Path export path; pilots execute cleanly.  
**Reference:** `docs/technical/epic17-billing-architecture.md` §8 · `stripePaymentIntentCore.ts` · `setTenantBillingStatusAction`

| ID | Check | Status |
|----|-------|--------|
| PA-BIL.1 | **Path A documented** — Stripe `payment_intent.succeeded` → `ACTIVE` | — |
| PA-BIL.2 | **Path B documented** — admin UI `setTenantBillingStatusAction` (no raw SQL) | — |
| PA-BIL.3 | Admin onboarding — **Activate for pilot** control after quick provision | — |
| PA-BIL.4 | Stripe test checkout → `ACTIVE` within 60s (staging) | — |
| PA-BIL.5 | Run #4 Stop 5 passes using Path A or B only (no manual DB) | — |
| PA-BIL.6 | `golden-path-checklist.md` updated — no SQL billing prep step | — |
| **PA-BIL** | **Billing automation sign-off** — all PA-BIL.* PASS | — |

**Verify:** `npx vitest run tests/unit/tenantBillingActiveGate.test.ts tests/unit/billingWebhookRoute.test.ts`

---

## FL1 — Phase A exit (Pilot-ready)

| Criterion | Status |
|-----------|--------|
| PA-R4 Golden Path Run #4 | — |
| PA-SEC Ops secrets green | — |
| PA-BIL Billing activation automated | — |
| **FL1 PILOT-READY** | — |

**Approved by:** _______________ **Date:** _______________

---

# Phase B — Commercial-ready (Finish Line 2)

> **Prerequisite:** **FL1** must be **PASS** before Phase B sign-off.  
> **Exit criteria:** **PB-LC** + **PB-ENT** + **PB-SKU** + **PB-GTM** all **PASS** → sign **FL2**.

---

## PB-LC — Stripe subscription lifecycle

**Target:** Webhooks reliably update state on `customer.subscription.updated` and `customer.subscription.deleted` (`PAST_DUE`, cancel).  
**Reference:** `docs/technical/epic17-billing-architecture.md` §8, §10

| ID | Check | Status |
|----|-------|--------|
| PB-LC.1 | Prisma: `basePriceCents`, `planSku`, `stripeSubscriptionId` on `tenant_billing` | — |
| PB-LC.2 | Stripe Products + Prices with metadata (`plan_sku`, `base_price_cents`, `tenant_slug`) | — |
| PB-LC.3 | Handler: `customer.subscription.updated` → `PAST_DUE` when past_due/unpaid | — |
| PB-LC.4 | Handler: `customer.subscription.deleted` → `PENDING` or archived | — |
| PB-LC.5 | Idempotency + audit log on subscription events | — |
| PB-LC.6 | Grace window warning + hard `DashboardBillingGate` block (default 14d) | — |
| PB-LC.7 | `/account/billing-hold?status=PAST_DUE` renewal CTA | — |
| PB-LC.8 | Staging: active → past_due → canceled without manual DB | — |
| **PB-LC** | **Subscription lifecycle sign-off** | — |

**Verify:** `npx vitest run tests/unit/billingWebhookRoute.test.ts` (extended)

---

## PB-ENT — Full entitlement enforcement (matrix + routing)

**Target:** Expand beyond Ironquery-only gate; enforce every `billing_gate: true` route via complete entitlement matrix.  
**Reference:** `config/route-manifest.v0.1.0-ga-epic17.json` · `app/lib/auth/tenantFeatureEntitlement.ts`

| ID | Check | Status |
|----|-------|--------|
| PB-ENT.1 | `/integrity`, `/cockpit`, `/board-report` → `GRC_DASHBOARD` | — |
| PB-ENT.2 | `/exports` → `IRONQUERY_EXPORT` + tier quota | — |
| PB-ENT.3 | `/evidence` → `EVIDENCE_LOCKER_WORM` (VAULT tier) | — |
| PB-ENT.4 | `/audit`, `/boardroom/admin/audit-logs` → tier gates | — |
| PB-ENT.5 | `/opsupport`, `/trust` → billing + tier | — |
| PB-ENT.6 | API routes (threats, dashboard, ingestion, trainer) aligned | — |
| PB-ENT.7 | Design-partner slugs mapped to tier (not only seed tenants) | — |
| PB-ENT.8 | UX: billing hold vs tier upgrade distinguished in hold panel | — |
| PB-ENT.9 | Unit test matrix: PENDING denied; tier mismatch denied; ACTIVE allowed | — |
| **PB-ENT** | **Entitlement matrix sign-off** | — |

**Verify:** `npx vitest run tests/unit/ironqueryExportBillingGate.test.ts tests/architecture/gatewayShield.test.ts`

---

## PB-SKU — Approved external pricing / SKU table

**Target:** Replace “contact sales / placeholder” with publishable SKU table matching entitlement rules.  
**Reference:** `docs/sales/pricing-and-packaging.md` · `app/(public)/pricing/page.tsx`

| ID | Check | Status |
|----|-------|--------|
| PB-SKU.1 | Internal approval — Command + Governance+ USD prices (BigInt cents) | — |
| PB-SKU.2 | Add-on pricing documented (Sustainability, Vault, MSSP if sold) | — |
| PB-SKU.3 | Stripe catalog synced; Payment Links in Vercel env | — |
| PB-SKU.4 | `/pricing` shows approved prices + live checkout CTA | — |
| PB-SKU.5 | `pricing-and-packaging.md` — placeholder banner removed | — |
| PB-SKU.6 | Sales enablement + procurement pack hydrated | — |
| **PB-SKU** | **SKU / pricing sign-off** | — |

---

## PB-GTM — Phase B GTM (reference customer + in-tenant support)

**Target:** Second reference customer on production + in-tenant support so paid customers are credibly supported.  
**Reference:** `docs/sales/market-entrance-playbook.md` §4 Phase B

| ID | Check | Status |
|----|-------|--------|
| PB-GTM.1 | Second tenant on production subdomain — profile + BigInt ALE | — |
| PB-GTM.2 | Partner completes Golden Path Stops 1–5 on production host | — |
| PB-GTM.3 | Clean Ironquery export in partner board pack | — |
| PB-GTM.4 | `/dashboard/support` — slug + operator context pre-filled | — |
| PB-GTM.5 | Ticket persists to support ledger; admin dispatch from Operations Hub | — |
| PB-GTM.6 | Playwright in required PR CI (recommended) | — |
| PB-GTM.7 | Production BWC smoke cron + failure alert webhook | — |
| **PB-GTM** | **Phase B GTM sign-off** — BWC + one new reference documented | — |

**Verify:** Partner sign-off doc (mirror `bwc-wil-production-smoke.md`)

---

## FL2 — Phase B exit (Commercial-ready)

| Criterion | Status |
|-----------|--------|
| PB-LC Stripe subscription lifecycle | — |
| PB-ENT Full entitlement matrix | — |
| PB-SKU Approved pricing / SKUs | — |
| PB-GTM Phase B GTM | — |
| **FL2 COMMERCIAL-READY (Phase 1)** | — |

**Approved by:** _______________ **Date:** _______________

---

## GTM-3 — Scope-freeze lift (after FL2)

Not required for commercial-ready; unlocks broader roadmap per anti-roadmap:

- [ ] **3 paying design partners** — integration marketplace, public checkout, etc. unblocked

---

## Evidence log

| ID | Item | Result | Date | Operator | Evidence |
|----|------|--------|------|----------|----------|
| BP-01 | Golden Path Run #2 | PASS | 2026-07-01 | Dereck | `golden-path-checklist.md` |
| BP-02 | Golden Path Run #3 | PASS | 2026-07-03 | Dereck | slug `run3b` |
| BP-03 | BWC production smoke | PASS | 2026-07-05 | Wil | `bwc-wil-production-smoke.md` |
| BP-04 | GLOBAL_ADMIN access | PASS | 2026-07-07 | Dereck | PR #43 |
| PA-R4 | Golden Path Run #4 | — | | | |
| PA-SEC | Ops secrets green | — | | | |
| PA-BIL | Billing automation | — | | | |
| FL1 | Pilot-ready | — | | | |
| PB-LC | Subscription lifecycle | — | | | |
| PB-ENT | Entitlement matrix | — | | | |
| PB-SKU | Approved SKU / pricing | — | | | |
| PB-GTM | Phase B GTM | — | | | |
| FL2 | Commercial-ready | — | | | |
| GTM-3 | 3 paying design partners | — | | | |

---

## Out of scope (do not block FL1/FL2)

- Public self-serve registration (`config/registration.ts`)
- Integration marketplace · per-seat metering · SOC 2 certification
- 19-agent daily ops (4-agent rhythm is Phase 1 model)

---

## Quick verification commands

```bash
npx vitest run tests/unit/tenantBillingActiveGate.test.ts tests/unit/billingWebhookRoute.test.ts tests/unit/phase1Commercial.test.ts
npx vitest run tests/integration/pki-verification.test.ts tests/integration/epic13-telemetry-triage.test.ts
npm run test:e2e:production:bwc   # E2E_PRODUCTION=1
npx tsc --noEmit
```
