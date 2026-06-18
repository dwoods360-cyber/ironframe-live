# Production Deployment & Troubleshooting Playbook (Level 2)

**Milestone:** v0.1.0-ga-epic17 · **Released:** June 17, 2026

---

## 1. Canonical production environment blueprint

Populate these variables in your deployment manager before promoting to staging or production.

```bash
# ====================================================================
# IRONFRAME SAAS — PRODUCTION BLUEPRINT (v0.1.0-ga-epic17)
# ====================================================================

# Platform isolation & behavioral switches
IRONFRAME_PUBLIC_REGISTRATION_ENABLED=false
IRONBOARD_SEMI_AUTONOMOUS_MODE=1
IRONFRAME_STAGING_APEX_DOMAIN="<your-staging-apex-domain>"

# Storage (Prisma connection pool)
DATABASE_URL="postgresql://[user]:[password]@[host]/[database]?sslmode=require&connection_limit=20"
DIRECT_URL="postgresql://[user]:[password]@[host]/[database]?sslmode=require"

# Stripe financial keys
STRIPE_CREDENTIAL_MODE=live
STRIPE_SECRET_KEY_LIVE="sk_live_..."
STRIPE_SECRET_KEY_TEST="sk_test_..."
STRIPE_INSTANT_CHECKOUT_WEBHOOK_SECRET="whsec_..."
STRIPE_BILLING_WEBHOOK_SECRET="whsec_..."

# Upstream providers
GOOGLE_API_KEY="..."                   # Gemini web grounding (Ironboard discovery)
NEXT_PUBLIC_SUPABASE_URL="..."
NEXT_PUBLIC_SUPABASE_ANON_KEY="..."
RESEND_API_KEY="..."                   # Sales-assisted invitation mail
ELECTRICITY_MAPS_API_KEY="..."         # Live utility grid lookups
IRONFRAME_CRON_SECRET="..."            # Cron + board feed auth
```

See also: `.env.staging.example`, `config/stripe.ts`, `app/lib/auth/supabaseRedirectAllowlist.ts`.

---

## 2. Local multi-port validation sequence

Validate the commercial loop before remote promotion:

```bash
# Terminal A: main application
npm run dev

# Terminal B: Stripe webhook multiplexer
npm run dev:stripe:multiplexer

# Terminal C (optional): Stripe CLI forward
npm run dev:stripe:listen

# Terminal D: automated fixture verification
npm run verify:multiplexer
```

Confirm `checkout.session.completed` and `payment_intent.succeeded` reach audit tables without rollback. Design partner slug: `pilot-corp` · test fixture: `stripe-trigger-acorp.json`.

---

## 3. Incident triage runbooks

### Runbook 01: Boardroom returns HTTP 502 / CORE_TELEMETRY_DISCONNECTED

| Item | Detail |
|------|--------|
| **Cause** | Ironboard cannot reach Ironframe shared-context bridge |
| **Fix** | 1. Confirm Ironframe core plane is running. 2. Set `IRONFRAME_CORE_ORIGIN` to the correct host. 3. Verify tenant headers on bridge requests. 4. Check Ironframe logs for module build errors (stale `.next` cache). |

### Runbook 02: Web discovery returns stale seed targets

| Item | Detail |
|------|--------|
| **Cause** | `market_prospects` contains expansion templates (`* Ledger`, `* Vault`) that satisfied the old row-count threshold |
| **Fix** | 1. Inspect `market_prospects` where `region` matches the target market. 2. Delete template rows **or** let `verifyAndOptimizeMarketData()` purge them automatically on the next board/GTM query. 3. Ensure `GOOGLE_API_KEY` is set for live grounding. |

SQL (manual purge example):

```sql
DELETE FROM market_prospects
WHERE region = 'Germany'
  AND (company_name LIKE '% Ledger' OR company_name LIKE '% Vault'
       OR domain LIKE '%-ledger.io' OR domain LIKE '%-vault.finance');
```

### Runbook 03: Documentation reader white screen

| Item | Detail |
|------|--------|
| **Cause** | Unhandled error in `app/docs/[[...slug]]/page.tsx` — missing markdown file or build failure |
| **Fix** | 1. Check server logs for `ENOENT` / module build errors. 2. Verify `resolveDocPath()` target exists under `docs/`. 3. Clear `.next` and restart `npm run dev`. |

### Runbook 04: Health posture freeze (Agent 12)

| Item | Detail |
|------|--------|
| **Cause** | TAS health below triage threshold |
| **Fix** | Review `health-posture-triage` cron; follow `src/services/irontech/healthPostureMonitor.ts` |

---

## 4. CI merge gates

| Gate | Command |
|------|---------|
| Unit + integration | `npm run test` |
| Gateway shield | `npx vitest run tests/architecture/gatewayShield.test.ts` |
| Typecheck | `npx tsc --noEmit` |
| Stryker (≥85% Irontrust) | `npm run stryker:run` |
| Playwright E2E | `npx playwright test` |

---

## Sources

- `.github/workflows/ci.yml`
- `scripts/dev/stripe-webhook-multiplexer.mjs`
- `scripts/dev/verify-multiplexer-integration.ts`
- `Ironboard/src/services/marketProspectAuthenticity.ts`
