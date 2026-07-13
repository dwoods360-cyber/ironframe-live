# Pilot → Commercial Readiness Checklist

**Milestone:** `v0.1.0-ga-epic17` · **Posture:** sales-assisted invite + Stripe  
**Live tracker** — report each item as **PASS** or **FAIL**; this document updates as you go.

**Companion docs:** [Golden Path](golden-path-checklist.md) · [design partner production smoke](design-partner-production-smoke.md) · [Epic 17 billing](../technical/epic17-billing-architecture.md)

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

_Last updated: 2026-07-13_

| Item | Phase | Status | Notes |
|------|-------|--------|-------|
| **1A** Golden Path Run #4 | A | **PASS** | Run #4 complete — 3× bar with Runs 2–3 |
| **1B** Ops secrets green | A | **PASS** | PA-SEC.1–9 all PASS (2026-07-12) |
| **1C** Billing activation automated | A | **PASS** | PA-BIL.A–C all PASS (2026-07-13) |
| **FL1** Pilot-ready | A | **PASS** | 1A + 1B + 1C; production proof `pilot1` (2026-07-13) |
| **2A** Stripe subscription lifecycle | B | — | |
| **2B** Full entitlement matrix | B | — | |
| **2C** Approved SKU / pricing | B | — | |
| **2D** Phase B GTM | B | — | |
| **FL2** Commercial-ready | B | — | |
| **GTM-3** 3 paying design partners | Post-FL2 | — | |

### Baseline already complete

- [x] Golden Path Runs 2–3 · design partner production smoke · GLOBAL_ADMIN (PR #43) · Epic 17 foundation · invite-only gate · legal · ingress secrets

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
| PA-R4.4b Stop 4b | **PASS** |
| PA-R4.5 Stop 5 | **PASS** |
| PA-R4.5b Stop 5b — export | **PASS** |
| PA-R4.6 Stop 6 (optional) | **PASS** |
| **PA-R4** Overall | **PASS** |

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

**PA-R4.4b result:** **PASS** (2026-07-10)

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

**PA-R4.5 result:** **PASS** (2026-07-08)

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

**PA-R4.5b result:** **PASS** (2026-07-10)

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

**PA-R4.6 result:** **PASS** (2026-07-08)

---

### Item 1A sign-off

**You do:** Record Run #4 in `docs/ops/golden-path-checklist.md` run log (date, slug, operator).

**How does Item 1A stand? (PASS / FAIL):** **PASS** (2026-07-10)

**Notes:** Run #4 complete — Stops 1–5b + 4b + optional Stop 6. Completes 3× consecutive bar with Runs 2–3.

---

## Item 1B — Ops secrets checklist green

**ID:** `1B` · `PA-SEC`  
**Objective:** Confirm production/staging secrets exist and **work** — not just listed in `.env.example`.  
**Where you work:** Vercel Dashboard · GitHub repo Settings · Stripe Dashboard · (optional) GCP Console

| Sub-item | Status |
|----------|--------|
| PA-SEC.1 Database & Supabase | **PASS** |
| PA-SEC.2 Ingress & apex DNS | **PASS** |
| PA-SEC.3 PKI keys | **PASS** |
| PA-SEC.4 Crons | **PASS** |
| PA-SEC.5 Electricity Maps + comms | **PASS** |
| PA-SEC.6 Stripe | **PASS** (ingress + pricing 2026-07-12) |
| PA-SEC.7 Workforce ingress | **PASS** (2026-07-12) |
| PA-SEC.8 GCP deploy | **PASS** (2026-07-12) |
| PA-SEC.9 design-partner smoke CI | **PASS** (2026-07-12) |
| **PA-SEC** Overall | **PASS** |

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

**PA-SEC.1 result:** **PASS** (2026-07-10) — Vercel Production vars confirmed; `prisma migrate status` → 47 migrations, schema up to date; Supabase `_prisma_migrations` ledger clean (latest `20260710143000_tenant_operator_contact_profiles`).

---

### 1B.2 — Ingress & tenant subdomains

**You do:**

1. In Vercel Production, confirm `IRONFRAME_CRON_SECRET` and `IRONFRAME_ALLOW_PUBLIC_INGRESS=1` (or document subdomain-only GTM)
2. In browser (logged out), open **`https://{tenant}.ironframegrc.com/login`**

**You should see:**

- design-partner branded login page — HTTP 200
- Not a plain **403** quarantine page

**Fail if:**

- `{tenant}.ironframegrc.com` returns 403 “deployment quarantine” for login

**PA-SEC.2 result:** **PASS** (2026-07-10) — `IRONFRAME_ALLOW_PUBLIC_INGRESS` was present in Vercel but **empty**; set to `1`, production redeployed. `{tenant}.ironframegrc.com/login` → 200; `/integrity` → 307 to login (no quarantine HTML). `IRONFRAME_CRON_SECRET` present in Production.

---

### 1B.3 — PKI keys (Epic 11)

**Objective:** Prove **live Vercel Production** resolves Epic 11 dual-gate PEMs at runtime — not local ephemeral Vitest keys.

**Vercel naming note:** Do **not** use `PUBLIC_*` env names on Vercel for server PKI — Vercel excludes them from server injection. Use:

- `IRONFRAME_VAULT_RELEASE_PUBLIC_KEY`
- `IRONFRAME_CISO_HANDSHAKE_PUBLIC_KEY`

**You do:**

1. Vercel Production — confirm both `IRONFRAME_*` keys exist (Encrypted / Sensitive).
2. Provision (one-time or rotation):

```powershell
node scripts/provision-production-pki.mjs
npx vercel deploy --prod
```

3. Run **live production probes**:

```powershell
npm run test:production:pki
npm run test:e2e:production:pki
```

**You should see:**

- `test:production:pki` → `PASS — production PKI env is wired for SaaS runtime`
- Playwright **2/2 passed**:
  - `GET /api/internal/pki-health` → `ok: true`, sources `IRONFRAME_VAULT_RELEASE_PUBLIC_KEY` + `IRONFRAME_CISO_HANDSHAKE_PUBLIC_KEY`
  - `{tenant}.ironframegrc.com/vault` loads without ingress quarantine

**Fail if:**

- `/api/internal/pki-health` returns **503** or `resolved: false`
- Playwright vault test sees **LOCAL DEVELOPMENT ONLY** quarantine HTML
- Only `npx vitest run tests/integration/pki-verification.test.ts` cited as proof (generates ephemeral keys in-test)

**PA-SEC.3 result:** **PASS** (2026-07-11) — IRONFRAME_* PEMs provisioned; production deploy; live pki-health + Playwright 2/2 green.

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

**PA-SEC.4 result:** **PASS** (2026-07-11) — `health-posture-triage` valid bearer → **200** (`success: true`, `OPERATIONAL_BASELINE`); wrong bearer → **401** `Unauthorized`. `IRONFRAME_CRON_SECRET` present in Production.

---

### 1B.5 — Electricity Maps & comms (Epic 9/5)

**Where you work:** Vercel Production · live tenant host (`https://{tenant}.ironframegrc.com` or gridcore)

**You do:**

1. Vercel Production — confirm:
   - `ELECTRICITY_MAPS_API_KEY`
   - `GOOGLE_API_KEY`
   - `RESEND_API_KEY`
   - `THREAT_CONFIRMATION_RECIPIENTS` (comma-separated)
2. Log in to tenant host → Command Post `/`
3. Right rail: Carbon Pulse + Sustainability Analytics Plane
4. Center column: ALE Exposure Map — carbon mitigated line
5. Network tab or logs: `GET /api/sustainability/stats` (or Vercel Functions logs filtered `electricity` / `ironbloom`)

**You should see:**

- Carbon widgets show live zone/intensity (not mock-only)
- `GET /api/sustainability/stats` → **200**, `ok: true`, `source: "electricity-maps"`
- No repeating **mock fallback** / **ELECTRICITY_MAPS_API_KEY missing** in production logs

**Fail if:**

- Persistent mock-fallback warnings on every poll
- All carbon widgets stuck on `$0.00` + mock errors on telemetry-seeded tenant
- `RESEND_API_KEY` or `GOOGLE_API_KEY` absent in Production

**PA-SEC.5 result:** **PASS** (2026-07-11) — all four Production env vars present; `{tenant}.ironframegrc.com/api/sustainability/stats` → **200** `ok:true` `source:electricity-maps` zone `US-NE-ISNE` @ 263 gCO₂/kWh; `/api/grc/carbon-pulse` same; 312 stats requests / 24h with **0** runtime errors; no mock-fallback log hits.

---

### 1B.6 — Stripe commerce

**You do:**

1. Vercel Production: `STRIPE_SECRET_KEY`, `STRIPE_INSTANT_CHECKOUT_WEBHOOK_SECRET`, `STRIPE_BILLING_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_COMMAND_TIER_CHECKOUT_URL`, `STRIPE_CREDENTIAL_MODE=live`
2. Stripe Dashboard → **Developers → Webhooks** — confirm endpoints:
   - `…/api/webhooks/stripe` → `checkout.session.completed` (instant provision)
   - `…/api/billing/webhook` → `payment_intent.succeeded` (activate existing tenant)
3. Open **`https://ironframegrc.com/pricing`** (logged out)
4. Local ironclad proof (test mode): `npm run smoke:stripe:ironclad`
5. Production ingress probe (no payment): `npm run smoke:stripe:production-ingress`

**You should see:**

- Pricing page: **“Buy now”** (not only “Contact sales”) when checkout URL is set
- **Instant activation** / Stripe CTA button links to `buy.stripe.com` or checkout.stripe.com
- Local smoke: Path A provision + Path B activation + negative signature tests **PASS**
- Production ingress: both webhook routes return **400** on bad signature (not quarantine HTML)

**Fail if:**

- Pricing shows **“Contact sales”** only while you expect live checkout
- Webhook endpoints missing or all events failing in Stripe Dashboard

**PA-SEC.6 result:** **PASS** (2026-07-12) — Deploy `dpl_FD4j44YwvmW2zf1ZjqrTV4p5TnkV`; ingress 3/3 + signed webhooks 3/3 (`smoke:stripe:production-ingress`, `smoke:stripe:production-webhooks`). Split secrets synced via `ops:sync-stripe-production-webhooks --apply` → `STRIPE_INSTANT_CHECKOUT_WEBHOOK_SECRET`, `STRIPE_BILLING_WEBHOOK_SECRET`, `STRIPE_WEBHOOK_SECRET` on Vercel Production. Stripe test endpoints on `https://ironframegrc.com/api/webhooks/stripe` + `/api/billing/webhook`. `/pricing` public + Buy now. **Pilot note:** `STRIPE_CREDENTIAL_MODE=test` in Production — flip to `live` before commercial GA.

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

**PA-SEC.7 result:** **PASS** (2026-07-12) — All four ingress secrets present in Vercel Production + GitHub Actions. `/dashboard/operations` loads; portal cards online (no blanket 401).

---

### 1B.8 — GCP Cloud Run deploy

**You do:**

1. GitHub → **Actions** → **GCP Sovereign Deploy** on latest `main` merge
2. Open the workflow run

**You should see:**

- Green checkmark; Docker push + deploy succeeded

**Fail if:**

- Red X on test or deploy job

**PA-SEC.8 result:** **PASS** (2026-07-12) — GCP Sovereign Deploy workflow green on latest `main`; Docker push + Cloud Run deploy succeeded.

---

### 1B.9 — Production design-partner smoke CI (recommended)

**You do:**

1. GitHub → **Settings → Secrets and variables → Actions → Variables** — `PRODUCTION_SMOKE_ENABLED=true`
2. **Actions → Production design-partner smoke → Run workflow**
3. Wait for completion

**You should see:**

- Workflow green; Playwright 6/6 against `{tenant}.ironframegrc.com`

**Fail if:**

- Workflow skipped (variable not true) when you expected it to run
- Login or export step fails in artifacts

**PA-SEC.9 result:** **PASS** (2026-07-12) — `PRODUCTION_SMOKE_ENABLED=true`; Production design-partner smoke workflow green; Playwright 6/6 against `{tenant}.ironframegrc.com`.

---

### Item 1B sign-off

**How does Item 1B stand? (PASS / FAIL):** **PASS** (2026-07-12) — All nine PA-SEC sub-items green.

---

## Item 1C — Automate billing activation (PENDING → ACTIVE)

**ID:** `1C` · `PA-BIL`  
**Objective:** Golden Path Stop 5 works **without** opening Prisma Studio or running raw SQL.

> **Current product note:** **Activate for pilot** is wired on Operator Daily Board (`OnboardingActivatePilotButton`). Per-client Stripe links: `npm run stripe:client-link -- --slug <slug> --company "<name>"`. Formal **PASS** requires production proof on `ironframegrc.com`.

| Sub-item | Status |
|----------|--------|
| PA-BIL.A Path A — Stripe webhook | **PASS** (2026-07-13) |
| PA-BIL.B Path B — payment_intent activation | **PASS** (2026-07-13) |
| PA-BIL.C Stop 5 proof | **PASS** (2026-07-13) |
| **PA-BIL** Overall | **PASS** |

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

**PA-BIL.A result:** **PASS** (2026-07-13) — `npm run smoke:stripe:ironclad`: `checkout.session.completed` on `/api/webhooks/stripe` → `stripe-e2e-corp` billing **ACTIVE** + audit trail; production signed webhook probes 3/3 on `ironframegrc.com`.

---

### Path B — Admin UI activate (GLOBAL_ADMIN only)

**You do:**

1. Sign in as **GLOBAL_ADMIN** (not MSSP BUSINESS_ADMIN)
2. After quick provision, on **`/admin/onboarding`**, locate **Activate for pilot** on the tenant row
2. Click it once for slug `run4b`
3. Refresh Operator Daily Board

**You should see:**

- Confirmation toast or inline message
- **Billing** badge → green **`ACTIVE`**
- Audit log entry (visible in board audit surfaces if configured)

**Fail if:**

- No activate control exists for GLOBAL_ADMIN — **Item 1C Path B = FAIL** (engineering must wire `setTenantBillingStatusAction`)
- MSSP **BUSINESS_ADMIN** used manual activate instead of Stripe — revenue leak; use Stripe Path A/B for partners

**PA-BIL.B result:** **PASS** (2026-07-13) — `smoke:billing:activation`: signed `payment_intent.succeeded` on `/api/billing/webhook` → `stripe-act-b1` **PENDING → ACTIVE** + `STRIPE_PAYMENT_INTENT_BILLING_ACTIVE` audit (no SQL).

---

### Stop 5 proof (billing automation only)

**You do:**

1. With **ACTIVE** badge confirmed (Path A or B only — no SQL)
2. Repeat **Item 1A Stop 5** on tenant host `/exports` → **Download CSV**

**You should see:**

- CSV downloads successfully (see Stop 5 expect signals)

**Fail if:**

- **`BillingSuspensionNotice`** or billing hold on `/exports`

**PA-BIL.C result:** **PASS** (2026-07-13) — Production slug `pilot1`: Path B quick-provision → Stripe `payment_intent.succeeded` → **ACTIVE** → Analyst export CSV on `pilot1.ironframegrc.com` (no billing hold). Local: billing gate unit tests 14/14; Epic 16 export integration 5/5; design partner production smoke (PA-SEC.9) on `{tenant}.ironframegrc.com`.

---

### Item 1C sign-off

**How does Item 1C stand? (PASS / FAIL):** **PASS** (2026-07-13) — Automated billing activation proven local + production webhook ingress; export perimeter green.

---

## Item 1D — Partner client provisioning (MSSP / consultant)

**ID:** `1D` · `PA-PART`  
**Objective:** A **BUSINESS_ADMIN** on a partner tenant can provision client workspaces over time without GLOBAL_ADMIN.

| Sub-item | Status |
|----------|--------|
| PA-PART.A CLIENTS console (`/admin/onboarding`) | — (local eng **PASS**) |
| PA-PART.B Scoped tenant list | — (local eng **PASS**) |
| PA-PART.C Assign provisioner role | — |
| **PA-PART** Overall | — |

**You do:**

1. Assign partner provisioner: `npm run ops:assign-partner-provisioner -- --email <partner@company.com> --tenant <partner-slug>`
2. Sign in as that user → header **CLIENTS** chip → `/admin/onboarding`
3. Quick provision a client slug → **Activate for pilot** → invite operator
4. Confirm partner sees only assigned client tenants (not full fleet)

**You should see:**

- Partner can provision and activate without GLOBAL_ADMIN
- Revoke panel and test-assets remain GLOBAL_ADMIN-only
- New client auto-linked to partner tenant assignment

**Fail if:**

- Partner hits 403 on `/admin/onboarding`
- Partner sees tenants outside their assignment scope

---

## FL1 — Phase A exit (Pilot-ready)

| Criterion | Status |
|-----------|--------|
| Item 1A | **PASS** |
| Item 1B | **PASS** |
| Item 1C | **PASS** |
| **FL1 PILOT-READY** | **PASS** |

**How does FL1 stand? (PASS / FAIL):** **PASS** (2026-07-13) — Phase A complete. Production proof workspace `pilot1` (Path B + export). Proceed to Phase B (2A–2D).

### Post-FL1 — Entity-plane UX naming pass

**ID:** `FL1-UX` · **Status:** **PASS** (2026-07-13)

| Surface | Change |
|---------|--------|
| `/register/contact` | Banner: *Request evaluation — no workspace created yet.* |
| `/admin/onboarding` quick-provision receipt | Labels: **Workspace subdomain** · **Path B activation link** · **Invite token** |
| `/get-started` | Above-fold **Step 2: define your primary GRC company** (in-tenant registers, not sales CRM) |

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
4. File partner sign-off doc (copy `design-partner-production-smoke.md` template)

**You should see:**

- Same pass signals as Item 1A but on `https://{slug}.ironframegrc.com`
- Billing **ACTIVE** via Stripe or admin UI

**Fail if:**

- Partner hits `/unauthorized` or 403 quarantine on production tenant host

---

### Your actions — in-tenant support

**You do:**

1. As **GRC_MANAGER** on tenant host (e.g. `{tenant}.ironframegrc.com`), go to **`/dashboard/support`**
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
| BP-03 | design partner production smoke | PASS | 2026-07-05 | Wil | |
| BP-04 | GLOBAL_ADMIN access | PASS | 2026-07-07 | Dereck | PR #43 |
| PA-R4.1 | Stop 1 — admin provision | PASS | 2026-07-08 | Dereck | Quick provision + activation URL |
| PA-R4.2 | Stop 2 — activation gate | PASS | 2026-07-08 | Dereck | Tenant host get-started?activation=1 |
| PA-R4.3 | Stop 3 — Get Started funnel | PASS | 2026-07-08 | Dereck | ALE + company profile saved |
| PA-R4.4 | Stop 4 — Integrity Hub | PASS | 2026-07-08 | Dereck | Tripane loads, nav OK |
| PA-R4.5 | Stop 5 — evidence / control stress | PASS | 2026-07-08 | Dereck | Vault readiness flow |
| PA-R4.6 | Stop 6 — IronBoard GTM (optional) | PASS | 2026-07-08 | Dereck | Market research query OK |
| PA-R4.4b | Stop 4b — revocation perimeter | PASS | 2026-07-10 | Dereck | API 403 after revoke |
| PA-R4.5b | Stop 5b — Ironquery export | PASS | 2026-07-10 | Dereck | ironquery-analyst-export CSV |
| 1A | Golden Path Run #4 | **PASS** | 2026-07-10 | Dereck | 3× bar with Runs 2–3 |
| PA-SEC.1 | Database & Supabase | PASS | 2026-07-10 | Dereck | 47 migrations applied; schema up to date |
| PA-SEC.2 | Ingress & apex DNS | PASS | 2026-07-10 | Dereck | Empty ingress var fixed → `1`; prod redeploy |
| PA-SEC.3 | PKI keys (live) | PASS | 2026-07-11 | Dereck | IRONFRAME_* PEMs; pki-health + Playwright 2/2 |
| PA-SEC.4 | Crons (Epic 13) | PASS | 2026-07-11 | Dereck | health-posture-triage 200; negative 401 |
| PA-SEC.5 | Electricity Maps + comms | PASS | 2026-07-11 | Dereck | live electricity-maps on tenant host; 4 env vars |
| PA-SEC.6 | Stripe commerce | PASS | 2026-07-12 | Dereck | ingress 3/3 + webhooks 3/3; `/pricing` Buy now |
| PA-SEC.7 | Workforce ingress | PASS | 2026-07-12 | Dereck | ops hub loads; portal cards online |
| PA-SEC.8 | GCP Cloud Run deploy | PASS | 2026-07-12 | Dereck | Sovereign Deploy workflow green |
| PA-SEC.9 | Production design-partner smoke CI | PASS | 2026-07-12 | Dereck | Playwright 6/6 on {tenant}.ironframegrc.com |
| 1B | Ops secrets | **PASS** | 2026-07-12 | Dereck | PA-SEC.1–9 all green |
| PA-BIL.A | Path A — Stripe provision webhook | PASS | 2026-07-13 | Dereck | stripe-e2e-corp ACTIVE via checkout.session.completed |
| PA-BIL.B | Path B — payment_intent activation | PASS | 2026-07-13 | Dereck | stripe-act-b1 PENDING→ACTIVE + audit |
| PA-BIL.C | Stop 5 export proof | PASS | 2026-07-13 | Dereck | billing gate 14/14; design-partner exports on prod |
| 1C | Billing automation | **PASS** | 2026-07-13 | Dereck | smoke:stripe:ironclad + prod webhooks 3/3 |
| 1D | Partner client provisioning | — | | | Local eng PASS; assign + prod walkthrough open |
| FL1 | Pilot-ready | **PASS** | 2026-07-13 | Dereck | 1A + 1B + 1C all green |
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
npm run test:production:pki
npm run test:e2e:production:pki
E2E_PRODUCTION=1 npm run test:e2e:production:smoke
```
