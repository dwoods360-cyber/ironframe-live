# Tier A Ops — Vercel Staging Checklist

**Branch:** `main` · **Reference:** [`GA_OPEN_ROADMAP.md`](./GA_OPEN_ROADMAP.md) · **Template:** [`.env.example`](../.env.example)

Copy each variable into **Vercel → Project → Settings → Environment Variables** (scope: **Preview** and/or **Production** as appropriate). Never commit real values.

---

## Required shells (populate in dashboard)

| Variable | Purpose | Example shape (not real secrets) |
|----------|---------|----------------------------------|
| `DATABASE_URL` | Prisma + LangGraph checkpointer (pooled Supabase URL, port **6543**, `?pgbouncer=true`) | `postgresql://USER:PASS@HOST:6543/postgres?pgbouncer=true` |
| `DIRECT_URL` | Migrations / session pooler (port **5432**) | `postgresql://USER:PASS@HOST:5432/postgres` |
| `IRONFRAME_CRON_SECRET` | Bearer / `x-cron-secret` for `POST /api/internal/cron/*` (Vercel Cron + manual smoke) | `openssl rand -hex 32` |
| `PUBLIC_KEY_ID` | Vault Supervisor PKI key id (must match dynamic PEM env suffix) | `vault-key-2026` |
| `PUBLIC_KEY_<NORMALIZED_ID>` | PEM SPKI for Gate A verify (`PUBLIC_KEY_ID` → `PUBLIC_KEY_VAULT_KEY_2026`) | `-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----` |

**PKI naming:** `vault-key-2026` normalizes to `PUBLIC_KEY_VAULT_KEY_2026`. Dev fallbacks: `PUBLIC_KEY` or `VAULT_SUPERVISOR_PUBLIC_KEY` (replace on staging).

---

## Tier A — strongly recommended (same Vercel project)

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Auth + session (middleware) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon / publishable key |
| `GOOGLE_API_KEY` | Sovereign bus / Ironquery RAG |
| `NEXT_PUBLIC_APP_URL` | Canonical origin for Ironcast / transparency links |
| `RESEND_API_KEY` | Ironcast email dispatch |
| `THREAT_CONFIRMATION_RECIPIENTS` | Comma-separated alert inboxes |
| `ELECTRICITY_MAPS_API_KEY` | Ironwatch / carbon intensity |
| `IRONFRAME_INTERNAL_GATES_SECRET` | Middleware stale-lockdown / quarantine probes (optional; falls back to cron secret) |

---

## Vercel Cron routes (`vercel.json`)

Authenticated with `Authorization: Bearer <IRONFRAME_CRON_SECRET>` or header `x-cron-secret: <IRONFRAME_CRON_SECRET>`:

| Schedule | Path |
|----------|------|
| `0 9 1 * *` | `/api/internal/cron/carbon-budget-reallocation` |
| `0 6 * * *` | `/api/internal/cron/gridcore-rate-poll` |
| `*/30 * * * *` | `/api/internal/cron/health-posture-triage` |

**Smoke (after deploy):**

```bash
curl -sS -X POST "$APP_URL/api/internal/cron/health-posture-triage" \
  -H "Authorization: Bearer $IRONFRAME_CRON_SECRET"
```

---

## Verification (local or CI)

```bash
npx tsc --noEmit
npx vitest run tests/integration/pki-verification.test.ts tests/integration/epic13-telemetry-triage.test.ts
npm run live-fire:telemetry-ingest   # requires local .env.local + npm run dev
```

---

## Checkbox

- [ ] `DATABASE_URL` + `DIRECT_URL` (Supabase staging)
- [ ] `IRONFRAME_CRON_SECRET` (staging + production, distinct values)
- [ ] `PUBLIC_KEY_ID` + matching `PUBLIC_KEY_*` PEM (no dev fallback strings in prod)
- [ ] Supabase public keys + `NEXT_PUBLIC_APP_URL`
- [ ] `GOOGLE_API_KEY`, `RESEND_API_KEY`, `THREAT_CONFIRMATION_RECIPIENTS`
- [ ] Cron smoke: gridcore-rate-poll, health-posture-triage, carbon-budget-reallocation
- [ ] PKI: `npx vitest run tests/integration/pki-verification.test.ts`
