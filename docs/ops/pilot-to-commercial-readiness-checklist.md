# Pilot → Commercial Readiness Checklist

**Milestone:** `v0.1.0-ga-epic17` · **Posture:** sales-assisted invite + Stripe  
**Live tracker** — report each item as **PASS** or **FAIL**; this document updates as you go.

**Companion docs:** [Golden Path](golden-path-checklist.md) · [BWC production smoke](bwc-wil-production-smoke.md) · [Epic 17 billing](../technical/epic17-billing-architecture.md)

---

## How to report results

```text
Item 1A PASS — slug run4b, Stops 0–5 clean
PA-R4.5 FAIL — saw CommercialEntitlementHoldPanel on /exports
```

| Result | Meaning |
|--------|---------|
| **PASS** | You saw every “expect” signal; no “fail if” signals |
| **FAIL** | Any fail signal appeared, or a required click/path did not work |

### Action block legend (every task uses this)

| Label | Meaning |
|-------|---------|
| **You do** | Exact clicks, URLs, and inputs |
| **You should see** | UI copy, badges, redirects — pass signals |
| **Fail if** | Wrong screen, error, or missing element |

---

## Status dashboard

_Last updated: 2026-07-08_

| Item | Phase | Status | Notes |
|------|-------|--------|-------|
| **1A** Golden Path Run #4 | A | ⏳ | PA-R4.1–4.4 PASS — through Integrity Hub |
| **1B** Ops secrets green | A | — | |
| **1C** Billing activation automated | A | — | |
| **FL1** Pilot-ready | A | — | 1A + 1B + 1C PASS |
| **2A** Stripe subscription lifecycle | B | — | |
| **2B** Full entitlement matrix | B | — | |
| **2C** Approved SKU / pricing | B | — | |
| **2D** Phase B GTM | B | — | |
| **FL2** Commercial-ready | B | — | |
| **GTM-3** 3 paying design partners | Post-FL2 | — | |

### Baseline already complete

- [x] Golden Path Runs 2–3 · BWC production smoke · GLOBAL_ADMIN (PR #43) · Epic 17 foundation · invite-only gate · legal · ingress secrets

---

# Phase A — Pilot-ready (Finish Line 1)

> **Exit:** Items **1A**, **1B**, **1C** all **PASS** → sign **FL1**.

---

## Item 1A — Golden Path Run #4 (Stops 0–6)

**ID:** `1A` · `PA-R4`  
**Objective:** Pass the full local demo loop on a **fresh slug** (e.g. `run4b`) to complete the 3× bar with Runs 2–3.  
**Use:** Primary browser = GLOBAL_ADMIN · Second browser = **incognito** for operator activation.

| Stop | Status |
|------|--------|
| PA-R4.0 Stop 0 | — |
| PA-R4.1 Stop 1 | **PASS** |
| PA-R4.2 Stop 2 | **PASS** |
| PA-R4.3 Stop 3 | **PASS** |
| PA-R4.4 Stop 4 | **PASS** |
| PA-R4.4b Stop 4b | — |
| PA-R4.5 Stop 5 | — |
| PA-R4.6 Stop 6 (optional) | — |
| **PA-R4** Overall | — |

---

### Stop 0 — Environment prerequisites

**You do:**

1. In a terminal at repo root: `npm run dev`
2. Open `http://127.0.0.1:3000/login` in your normal browser
3. Sign in as **GLOBAL_ADMIN** (`dwoods360@gmail.com`)
4. Open a **new incognito** window (keep it ready for Stop 2)
5. Optional — only if running Stop 6: `cd Ironboard && npm run dev`, then confirm `http://127.0.0.1:8082` loads

**You should see:**

- Login page loads (dark cockpit theme)
- After sign-in: Command Post or dashboard shell — **not** `/unauthorized`
- Terminal shows `Ready` on port 3000

**Fail if:**

- `npm run dev` crashes or port 3000 unreachable
- GLOBAL_ADMIN lands on `/unauthorized`
- You proceed on a cloud URL (`ironframegrc.com`) instead of `127.0.0.1` / `lvh.me` for Golden Path

---

### Stop 1 — Admin provision

**You do:**

1. Go to **`http://127.0.0.1:3000/admin/onboarding`** (or apex lvh.me equivalent)
2. Scroll past the **Operator Daily Board** table to the cyan section **“Quick provision — tenant + activation invite”**
3. Fill in:
   - **Business display name:** e.g. `Run 4 Beta Corp`
   - **Workspace slug:** e.g. `run4b` (lowercase, no spaces)
   - **Operator email:** the test operator email (e.g. a Gmail you control)
4. Click **`Quick provision workspace`**
5. Wait for the cyan success panel; **copy the Secure activation URL** (looks like `/register/{token}` or tenant login with invite)

**You should see:**

- Progress panel steps complete without red error text
- Green/cyan panel: **“Workspace provisioned”** (or “Invitation minted” if slug existed)
- **Secure activation URL** in a monospace code block
- **Operator Daily Board** (top of page) shows new row with:
  - Organization name matching your input
  - **Billing** badge: amber **`PENDING`** (expected before Item 1C)
  - **Infra:** `PROVISIONED`

**Fail if:**

- Red error under the form (`role="alert"`)
- No activation URL displayed
- Slug rejected (reserved word, invalid pattern)

**PA-R4.1 result:** **PASS** (2026-07-08)

---

### Stop 2 — Activation gate

**You do:**

1. In **incognito**, paste the activation URL but rewrite host to tenant subdomain:  
   **`http://run4b.lvh.me:3000/register/{token}`**  
   (replace `run4b` with your slug)
2. **First-time operator:** set password + confirm password; check **MSA** and **DPA** boxes; submit
3. **Existing operator:** use **`http://run4b.lvh.me:3000/login?invite={token}`** — enter email + password; sign in
4. Watch the URL bar after submit

**You should see:**

- Registration page: target email shown; tenant slug referenced
- After submit: redirect to **`http://run4b.lvh.me:3000/get-started?activation=1`**
- URL stays on **`run4b.lvh.me`** — not `127.0.0.1` and not apex `/integrity`
- Header shows tenant context (co-brand if configured)

**Fail if:**

- Redirect to `/unauthorized`
- Redirect to `http://127.0.0.1:3000/integrity` (apex detour)
- “Invite expired” or “invalid token”
- Login loop (returns to `/login` after password)

**PA-R4.2 result:** **PASS** (2026-07-08)

---

### Stop 3 — Funnel ingestion (Get Started)

**You do:**

1. Stay on tenant host: **`http://run4b.lvh.me:3000/get-started`**
2. Find amber panel **“Workspace ALE baseline required”**
3. In **ALE baseline (USD)**, type a whole number, e.g. `5000000`
4. Click **`Save ALE baseline`**
5. After green confirmation, find cyan panel **“Company profile required”**
6. Fill company fields (legal name, industry, etc.) and click **`Save company profile`**
7. Glance at **Progress** meter in header (top right)

**You should see:**

- After ALE save: green text **“ALE baseline saved at $…”**
- Amber panel collapses; line **“Workspace ALE baseline: $…”** appears
- After profile save: cyan panel clears; **Progress** percentage increases
- No full-page amber **“Training corpus sealed until billing is active”** blocking the whole portal (billing may still be PENDING — Get Started is exempt)
- You can click checklist links toward Command Post / docs

**Fail if:**

- Red error under ALE or profile save
- **`CommercialEntitlementHoldPanel`** with **“Awaiting subscription confirmation”** blocks all checklist progress
- **Progress** stuck at 0% after both saves
- **`BillingSuspensionNotice`** — **“Workspace access paused”** on `/get-started` (should be exempt)

**PA-R4.3 result:** **PASS** (2026-07-08)

---

### Stop 4 — Integrity triage

**You do:**

1. On tenant host, click top nav **`INTEGRITY HUB`** (2nd chip in header)
2. Wait up to ~90s on cold start
3. Scroll left pane, center threat list, and right detail pane independently
4. Click one Active Risk card if present
5. Click **`COMMAND POST`** or **`BACK TO COMMAND POST`** to leave

**You should see:**

- URL: `/integrity`
- Three-pane “tripane” layout loads (left controls · center risks · right detail)
- No browser “Page unresponsive” dialog
- No frozen full-screen overlay blocking nav
- Return to Command Post works in one click

**Fail if:**

- Blank white/black viewport forever
- Console spam with uncaught errors during load
- Cannot navigate away without force-refresh
- **`FETCH BLOCKED: NO TENANT CONTEXT`** banner

**PA-R4.4 result:** **PASS** (2026-07-08)

---

### Stop 4b — Revocation perimeter

**You do:**

1. Switch to **GLOBAL_ADMIN** browser (not incognito)
2. Go to **`/admin/onboarding`** → scroll to amber section **“Revoke operator workspace access”**
3. Enter the **same operator email** and **workspace slug** from Stop 2
4. Click **`Revoke workspace access`** → confirm the browser dialog
5. In incognito (if session still alive), open DevTools → **Network**
6. Navigate or fetch: `/api/threats/active` and `/api/dashboard`

**You should see:**

- Green success message after revoke
- API responses: **403** with workspace-access message
- No JSON body with live threat rows or dashboard metrics

**Fail if:**

- Revoke returns red error
- APIs return **200** with tenant data after assignment deleted
- Incognito session still streams Active Risks on `/integrity`

---

### Stop 5 — Control mapping & evidence ingestion (PA-R4.5)

**Prerequisite:** Billing **`ACTIVE`** for the slug (`/admin/billing` or Item 1C).

**You do:**

1. On tenant host (e.g. `https://run4b.ironframegrc.com` or `http://run4b.lvh.me:3000`), sign in as operator
2. Header → **`EVIDENCE VAULT`** (`/vault`)
3. In **Control gaps** card: **`Stress test`** on a row **or** **`Review all gaps →`** → drawer → **`Trigger Control Stress Test`**
4. Header → **`INTEGRITY HUB`** → resolve **Sentinel Hypothesis: Control Stress Test :: …**
5. Return to **`EVIDENCE VAULT`** (no manual Refresh)

**You should see:**

- **Underwriter Readiness** gauge + **Auto-synced** badge
- Toast after stress test: `Stress test opened for {controlId}…`
- After resolve + return: readiness gauge updates; toast `Readiness updated: X% → Y%` when score changes
- `/evidence/gaps` redirects to `/vault?section=gaps` (drawer opens)

**Fail if:**

- **`CommercialEntitlementHoldPanel`** on `/vault` (billing `PENDING`)
- Stress test button no-op; readiness unchanged after resolve
- Legacy separate **Pre-Submission Audit** page (full-page navigation away from vault)

---

### Stop 5b — Executive export

**Prerequisite:** Billing must be **ACTIVE** before this stop — complete **Item 1C** first (admin activate or Stripe). Confirm Operator Daily Board shows green **`ACTIVE`** badge.

**You do:**

1. If Stop 4b revoked the operator: provision a **second invite** or use a different operator — re-activate on tenant host
2. On tenant host, go to **`http://run4b.lvh.me:3000/exports`**
3. Page title area: **“Compliance Export Ledger”** / **“Epic 16 · Analyst Export Console”**
4. Click **`Download CSV`**
5. Open your browser downloads folder; check filename

**You should see:**

- Export console with **`Download CSV`** and **`Download PDF`** buttons (not scope gate only)
- Status message: **`Downloaded ironquery-analyst-export-run4b.csv`** (tenant key = your slug)
- CSV opens with tenant-scoped rows
- **No** redirect to `/?exportScope=required`

**Fail if:**

- **`ExportScopeRequiredPanel`** — **“Complete workspace setup before exporting”** (ALE not saved — return to Get Started)
- **`CommercialEntitlementHoldPanel`** or **`BillingSuspensionNotice`** (billing still `PENDING`)
- Download named **`feature8_tabular_ledger_export_*`**
- Redirect to home with `?exportScope=required`

---

### Stop 6 — IronBoard GTM (optional)

**You do:**

1. Ensure IronBoard running: `cd Ironboard && npm run dev`
2. Open **`http://127.0.0.1:8082`**
3. Submit board query: *“Are you not able to perform real market research?”*

**You should see:**

- Affirmative answer or execution receipt — not an apology refusing batch loader

**Fail if:**

- Board says human operator must run batch loader manually

---

### Item 1A sign-off

**You do:** Record Run #4 in `docs/ops/golden-path-checklist.md` run log (date, slug, operator).

**How does Item 1A stand? (PASS / FAIL):** —

**Notes:**

```

```

---

## Item 1B — Ops secrets checklist green

**ID:** `1B` · `PA-SEC`  
**Objective:** Confirm production/staging secrets exist and **work** — not just listed in `.env.example`.  
**Where you work:** Vercel Dashboard · GitHub repo Settings · Stripe Dashboard · (optional) GCP Console

| Sub-item | Status |
|----------|--------|
| PA-SEC.1 Database & Supabase | — |
| PA-SEC.2 Ingress & apex DNS | — |
| PA-SEC.3 PKI keys | — |
| PA-SEC.4 Crons | — |
| PA-SEC.5 Electricity Maps + comms | — |
| PA-SEC.6 Stripe | — |
| PA-SEC.7 Workforce ingress | — |
| PA-SEC.8 GCP deploy | — |
| PA-SEC.9 BWC smoke CI | — |
| **PA-SEC** Overall | — |

---

### 1B.1 — Database & Supabase (Vercel Production)

**You do:**

1. Open **Vercel → ironframe-live → Settings → Environment Variables → Production**
2. Confirm each variable exists (names only — do not paste secrets in chat):
   - `DATABASE_URL`, `DIRECT_URL`
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_APP_URL`
3. Locally (read-only): `npx prisma migrate status` with production `DATABASE_URL` in env

**You should see:**

- All variables present with Production scope checked
- Migrate status: **“Database schema is up to date”**

**Fail if:**

- Missing `DATABASE_URL` or `DIRECT_URL`
- Migrate status shows pending migrations

---

### 1B.2 — Ingress & tenant subdomains

**You do:**

1. In Vercel Production, confirm `IRONFRAME_CRON_SECRET` and `IRONFRAME_ALLOW_PUBLIC_INGRESS=1` (or document subdomain-only GTM)
2. In browser (logged out), open **`https://bwc.ironframegrc.com/login`**

**You should see:**

- BWC branded login page — HTTP 200
- Not a plain **403** quarantine page

**Fail if:**

- `bwc.ironframegrc.com` returns 403 “deployment quarantine” for login

---

### 1B.3 — PKI keys (Epic 11)

**You do:**

1. Vercel Production: confirm `PUBLIC_KEY_ID` (e.g. `vault-key-2026`)
2. Confirm matching `PUBLIC_KEY_VAULT_KEY_2026` PEM (multi-line, begins with `-----BEGIN PUBLIC KEY-----`)
3. Run locally: `npx vitest run tests/integration/pki-verification.test.ts`

**You should see:**

- Vitest: all PKI tests **green**

**Fail if:**

- PKI tests fail or Production still uses dev fallback key strings

---

### 1B.4 — Crons (Epic 13)

**You do:**

1. Open `vercel.json` in repo — confirm three cron paths exist
2. After deploy, run in terminal (replace URL and secret):

```bash
curl -sS -X POST "https://ironframegrc.com/api/internal/cron/health-posture-triage" \
  -H "Authorization: Bearer YOUR_IRONFRAME_CRON_SECRET"
```

3. Run: `npx vitest run tests/integration/epic13-telemetry-triage.test.ts`

**You should see:**

- curl returns JSON with `ok: true` or success body — **not** 401/405
- Integration tests green

**Fail if:**

- 401 Unauthorized (wrong/missing cron secret)
- 405 Method Not Allowed

---

### 1B.5 — Electricity Maps & comms (Epic 9/5)

**You do:**

1. Vercel Production: confirm `ELECTRICITY_MAPS_API_KEY`, `GOOGLE_API_KEY`, `RESEND_API_KEY`, `THREAT_CONFIRMATION_RECIPIENTS`
2. On a sustainability-enabled tenant (e.g. gridcore seed or prod), open carbon/sustainability surface

**You should see:**

- Live region data or non-mock carbon coefficients in UI/logs

**Fail if:**

- Permanent “mock fallback” warnings in production logs for Electricity Maps

---

### 1B.6 — Stripe commerce

**You do:**

1. Vercel Production: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_COMMAND_TIER_CHECKOUT_URL`
2. Stripe Dashboard → **Developers → Webhooks** — confirm endpoints:
   - `…/api/webhooks/stripe`
   - `…/api/billing/webhook`
3. Open **`https://ironframegrc.com/pricing`** (logged out)

**You should see:**

- Pricing page: **“Buy now”** (not only “Contact sales”) when checkout URL is set
- **Instant activation** / Stripe CTA button links to `buy.stripe.com` or checkout.stripe.com

**Fail if:**

- Pricing shows **“Contact sales”** only while you expect live checkout
- Webhook endpoints missing or all events failing in Stripe Dashboard

---

### 1B.7 — Workforce ingress secrets

**You do:**

1. Vercel Production + GitHub Actions secrets: confirm `IRONLEADS_INGRESS_SECRET`, `SALESTEAM_INGRESS_SECRET`, `SUCCESS_TEAM_INGRESS_SECRET`, `SUPPORT_TEAM_INGRESS_SECRET`
2. Sign in as GLOBAL_ADMIN → **`/dashboard/operations`**

**You should see:**

- **Operations Command Center** loads
- Ironboard / Ironleads / SalesTeam portal cards show **online** or documented offline runbook — not blanket 401

**Fail if:**

- Operations hub redirects to `/unauthorized`
- Portal probes fail with “missing bearer” for all workers

---

### 1B.8 — GCP Cloud Run deploy

**You do:**

1. GitHub → **Actions** → **GCP Sovereign Deploy** on latest `main` merge
2. Open the workflow run

**You should see:**

- Green checkmark; Docker push + deploy succeeded

**Fail if:**

- Red X on test or deploy job

---

### 1B.9 — Production BWC smoke CI (recommended)

**You do:**

1. GitHub → **Settings → Secrets and variables → Actions → Variables** — `PRODUCTION_BWC_SMOKE_ENABLED=true`
2. **Actions → Production BWC Smoke → Run workflow**
3. Wait for completion

**You should see:**

- Workflow green; Playwright 6/6 against `bwc.ironframegrc.com`

**Fail if:**

- Workflow skipped (variable not true) when you expected it to run
- Login or export step fails in artifacts

---

### Item 1B sign-off

**How does Item 1B stand? (PASS / FAIL):** —

---

## Item 1C — Automate billing activation (PENDING → ACTIVE)

**ID:** `1C` · `PA-BIL`  
**Objective:** Golden Path Stop 5 works **without** opening Prisma Studio or running raw SQL.

> **Current product note:** Operator Daily Board shows a **PENDING** badge but a one-click **Activate** button is **not wired yet** — Item 1C is complete only when Path B UI exists. Until then, use **Path A (Stripe)** for Run #4.

| Sub-item | Status |
|----------|--------|
| PA-BIL.A Path A — Stripe webhook | — |
| PA-BIL.B Path B — Admin UI activate | — |
| PA-BIL.C Stop 5 proof | — |
| **PA-BIL** Overall | — |

---

### Path A — Stripe payment → ACTIVE (available today)

**You do:**

1. Ensure tenant from Stop 1 exists with slug `run4b`
2. Stripe Dashboard → use **test mode** Payment Link with metadata `slug=run4b`
3. Terminal: `stripe listen --forward-to http://127.0.0.1:3000/api/billing/webhook`
4. Complete test payment in browser
5. Refresh **`/admin/onboarding`** Operator Daily Board

**You should see:**

- Stripe CLI: `payment_intent.succeeded` event forwarded
- Operator Daily Board: **Billing** badge flips from amber **`PENDING`** to green **`ACTIVE`**
- Within 60 seconds — no manual DB edit

**Fail if:**

- Webhook 400/503 in Stripe CLI
- Badge stays **PENDING** after successful payment

---

### Path B — Admin UI activate (Item 1C deliverable)

**You do:**

1. After quick provision, on **`/admin/onboarding`**, locate **Activate for pilot** / **Set billing ACTIVE** on the tenant row or below provision form
2. Click it once for slug `run4b`
3. Refresh Operator Daily Board

**You should see:**

- Confirmation toast or inline message
- **Billing** badge → green **`ACTIVE`**
- Audit log entry (visible in board audit surfaces if configured)

**Fail if:**

- No activate control exists — **Item 1C Path B = FAIL** (engineering must wire `setTenantBillingStatusAction`)
- You had to use Prisma Studio or SQL instead

---

### Stop 5 proof (billing automation only)

**You do:**

1. With **ACTIVE** badge confirmed (Path A or B only — no SQL)
2. Repeat **Item 1A Stop 5** on tenant host `/exports` → **Download CSV**

**You should see:**

- CSV downloads successfully (see Stop 5 expect signals)

**Fail if:**

- **`BillingSuspensionNotice`** or billing hold on `/exports`

---

### Item 1C sign-off

**How does Item 1C stand? (PASS / FAIL):** —

---

## FL1 — Phase A exit (Pilot-ready)

| Criterion | Status |
|-----------|--------|
| Item 1A | — |
| Item 1B | — |
| Item 1C | — |
| **FL1 PILOT-READY** | — |

**How does FL1 stand? (PASS / FAIL):** —

---

# Phase B — Commercial-ready (Finish Line 2)

> **Prerequisite:** **FL1 PASS**

---

## Item 2A — Stripe subscription lifecycle

**ID:** `2A` · `PB-LC`  
**Objective:** Cancellations and failed renewals update app state — not only first payment.

### Your actions — staging lifecycle test

**You do:**

1. Create Stripe **test subscription** for a staging tenant with `stripeSubscriptionId` stored in DB
2. Stripe Dashboard → subscription → **⋯ → Update subscription** → simulate **past_due**  
   *or* `stripe trigger customer.subscription.updated`
3. Sign in as that tenant operator → open Command Post
4. Cancel subscription in Stripe → trigger `customer.subscription.deleted`

**You should see:**

- After past_due: in-app **warning** banner or amber hold copy; billing status **PAST_DUE** in admin board
- `/account/billing-hold?status=PAST_DUE` shows renewal CTA
- After cancel: status returns to **PENDING** or archived; **Download CSV** on `/exports` blocked with billing hold
- Stripe webhook logs in Dashboard: **200** responses

**Fail if:**

- DB status unchanged after Stripe events
- Operator retains full dashboard access while **PAST_DUE** beyond grace window
- Webhooks return 4xx/5xx

**How does Item 2A stand? (PASS / FAIL):** —

---

## Item 2B — Full entitlement matrix

**ID:** `2B` · `PB-ENT`  
**Objective:** Tier-gated routes block correctly — not only `/exports`.

### Your actions — tier denial test

**You do:**

1. Use a **BASELINE** tier tenant (e.g. medshield-class slug) with billing **ACTIVE**
2. Navigate to each route on tenant host:
   - `/integrity` → should **work**
   - `/evidence` → VAULT-only
   - `/exports` → should **work**
3. Attempt `/evidence` on BASELINE tenant

**You should see:**

- `/integrity` and `/exports` load normally
- `/evidence`: tier upgrade message or hold panel — **not** empty vault with live data
- **`CommercialEntitlementHoldPanel`** or upgrade CTA mentioning tier — distinct from billing **PENDING** copy

**Fail if:**

- BASELINE tenant accesses WORM evidence locker without upgrade path
- **PENDING** billing tenant accesses `/integrity` (billing gate should block non-exempt routes)

### Your actions — billing hold test

**You do:**

1. Set test tenant billing to **PENDING** (via admin UI when wired)
2. Try `/cockpit`, `/board-report`, `/audit` on tenant host

**You should see:**

- **`BillingSuspensionNotice`** — **“Workspace access paused”** on gated routes
- `/get-started` and `/integrity` still reachable (exempt paths)

**How does Item 2B stand? (PASS / FAIL):** —

---

## Item 2C — Approved SKU / pricing

**ID:** `2C` · `PB-SKU`  
**Objective:** Public pricing matches internal SKU table and Stripe catalog.

### Your actions — public pricing review

**You do:**

1. Open **`https://ironframegrc.com/pricing`** (incognito)
2. Read price line under **Command Tier**
3. Click **Buy now** / checkout CTA
4. Compare to `docs/sales/pricing-and-packaging.md` approved table

**You should see:**

- Published USD price (not **“Contact sales”** only)
- Stripe checkout shows **same amount** and product name
- `/terms` and `/privacy` links near CTA

**Fail if:**

- Placeholder “Contact sales” still shown in production
- Stripe price ≠ documented SKU table
- Checkout metadata missing `plan_sku` / `tenant_slug`

**How does Item 2C stand? (PASS / FAIL):** —

---

## Item 2D — Phase B GTM

**ID:** `2D` · `PB-GTM`  
**Objective:** Second production reference customer + in-tenant support.

### Your actions — second reference customer

**You do:**

1. Quick-provision new slug on **production** (`{slug}.ironframegrc.com`)
2. Send invite; partner completes Stops 2–5 on **production host** (incognito)
3. Partner downloads `ironquery-analyst-export-{slug}.csv`
4. File partner sign-off doc (copy `bwc-wil-production-smoke.md` template)

**You should see:**

- Same pass signals as Item 1A but on `https://{slug}.ironframegrc.com`
- Billing **ACTIVE** via Stripe or admin UI

**Fail if:**

- Partner hits `/unauthorized` or 403 quarantine on production tenant host

---

### Your actions — in-tenant support

**You do:**

1. As **GRC_MANAGER** on tenant host (e.g. `bwc.ironframegrc.com`), go to **`/dashboard/support`**
2. Click **`New ticket`**
3. Fill subject + description; submit
4. As **GLOBAL_ADMIN**, open **`/dashboard/operations`** → support / SuccessTeam view

**You should see:**

- Support page header: **“Request engineering help”** (or `REQUEST_ENGINEERING_HELP_LABEL`)
- Form pre-filled with **workspace slug** and operator context
- After submit: ticket appears in list with status **OPEN**
- Admin console shows same ticket for dispatch

**Fail if:**

- Redirect to cold **`/register/contact`** instead of in-app form
- Ticket not visible in admin Operations hub

**How does Item 2D stand? (PASS / FAIL):** —

---

## FL2 — Phase B exit (Commercial-ready)

| Criterion | Status |
|-----------|--------|
| Item 2A | — |
| Item 2B | — |
| Item 2C | — |
| Item 2D | — |
| **FL2 COMMERCIAL-READY** | — |

**How does FL2 stand? (PASS / FAIL):** —

---

## GTM-3 — After commercial-ready (scope-freeze lift)

**You do:** Close **3 paying design partners** with signed order forms; record in evidence log.

**How does GTM-3 stand? (PASS / FAIL):** —

---

## Evidence log

| ID | Item | Result | Date | Operator | Notes |
|----|------|--------|------|----------|-------|
| BP-01 | Golden Path Run #2 | PASS | 2026-07-01 | Dereck | |
| BP-02 | Golden Path Run #3 | PASS | 2026-07-03 | Dereck | slug `run3b` |
| BP-03 | BWC production smoke | PASS | 2026-07-05 | Wil | |
| BP-04 | GLOBAL_ADMIN access | PASS | 2026-07-07 | Dereck | PR #43 |
| PA-R4.1 | Stop 1 — admin provision | PASS | 2026-07-08 | Dereck | Quick provision + activation URL |
| PA-R4.2 | Stop 2 — activation gate | PASS | 2026-07-08 | Dereck | Tenant host get-started?activation=1 |
| PA-R4.3 | Stop 3 — Get Started funnel | PASS | 2026-07-08 | Dereck | ALE + company profile saved |
| PA-R4.4 | Stop 4 — Integrity Hub | PASS | 2026-07-08 | Dereck | Tripane loads, nav OK |
| 1A | Golden Path Run #4 | ⏳ | | | Stops 4b, 5–6 open |
| 1B | Ops secrets | — | | | |
| 1C | Billing automation | — | | | |
| FL1 | Pilot-ready | — | | | |
| 2A | Subscription lifecycle | — | | | |
| 2B | Entitlement matrix | — | | | |
| 2C | SKU / pricing | — | | | |
| 2D | Phase B GTM | — | | | |
| FL2 | Commercial-ready | — | | | |
| GTM-3 | 3 paying partners | — | | | |

---

## Quick commands (for engineering verification)

```bash
npx vitest run tests/unit/ironqueryExportBillingGate.test.ts tests/unit/tenantBillingActiveGate.test.ts
npx vitest run tests/integration/pki-verification.test.ts tests/integration/epic13-telemetry-triage.test.ts
E2E_PRODUCTION=1 npm run test:e2e:production:bwc
```
