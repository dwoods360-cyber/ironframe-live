# Ironframe Release Evidence — v0.1.0-ga-epic17

**Date:** June 2, 2026  
**Status:** APPROVED / GENERAL AVAILABILITY  
**Git tag:** `v0.1.0-ga-epic17` → `4ee77261` (tip at tag time)  
**Classification:** Infrastructure, real-time telemetry, and shadow smoke perimeters  

---

## 1. Cryptographic lineage and commit anchors

The following shippable SHAs were compiled, tested, and pushed to `origin/main`:

| SHA | Scope |
|-----|--------|
| `4ee77261` | **CI:** Postgres service containers pull `public.ecr.aws/docker/library/postgres:15` to avoid Docker Hub `auth.docker.io` timeouts on GitHub Actions runners. |
| `3f13be21` | **Deploy:** `health-posture-triage` cron set to `0 0 * * *` (Hobby tier); `vercel-integration-suite.mjs` gains `--cloud-only` and `test:vercel-integration:cloud:epic17`. |
| `2ba2c10a` | **Epic 17:** Live shadow smoke runner, `epic17TelemetryStream` observability echo on sovereign ingest, ironcast `[epic17-telemetry-stream]` logging. |

Prior Epic 17 foundation on the same train:

| SHA | Scope |
|-----|--------|
| `261e79a9` | Wire `telemetryPatchStream` into sovereign orchestration graph (ironcast node). |
| `d6bacd6c` | `stateDiffer` service and unit gates (`EPIC_17_DIFF_FLOAT_BLOCKED`, patch thresholds). |

---

## 2. Definitive verification gate matrix

### A. Local invariant verification

| Gate | Command | Result |
|------|---------|--------|
| Unit matrix | `npm run test:unit:epic17` | Passed — deterministic diffing, float blocked, tenant-scoped keys. |
| Integration matrix | `npm run test:integration:epic17` | Passed (3/3) — sequential patches, threshold breach, tenant isolation. |
| Local shadow smoke | `STAGING_SMOKE_BASE_URL=http://localhost:3000 npm run test:epic17-orchestration-shadow-smoke` | Exit 0 — sovereign lane; `epic17TelemetryStream.signature` = `[epic17-telemetry-stream]`, `ok: true`. |

### B. Cloud serverless edge verification

| Gate | Detail | Result |
|------|--------|--------|
| Deployment | `https://ironframe-live-73nf0qyso-dwoods360-6345s-projects.vercel.app` (production deploy of `3f13be21`+); aliased `https://ironframe-live.vercel.app` | Ready |
| Cron routing smoke | `node scripts/staging-smoke-cron.mjs` | 21/21 probes; `freezeGateGreen: true` |
| Ironquery exports | CSV + PDF probes via integration suite | HTTP 200; valid CSV header row and PDF magic |
| Telemetry echo | `node scripts/vercel-integration-suite.mjs --include-epic17 --cloud-only` | Exit 0; `epic17TelemetryStream.ok: true`, `lane: sovereign`, `status: COMPLETED` |
| Isolated shadow smoke | `npm run test:epic17-orchestration-shadow-smoke` against deploy URL | Exit 0; signature match on edge |

**Observability log signature (runtime + API echo):**

```text
[epic17-telemetry-stream] {"tenantId":"5c420f5a-8f1f-4bbf-b42d-7f8dd4bb6a01","initialized":true,"added":["agent_log_count","current_agent","health_bar_percent","ironquery_summary_signature","routing_target","status","threat_id"],...}
```

### C. CI pipeline

| Gate | Result |
|------|--------|
| GitHub Actions (`Ironframe CI`, Playwright, Deploy workflows) | **Passed** on `4ee77261` after ECR Postgres image migration |

---

## 3. Operational posture and known dispositions

- **Cron optimization:** `health-posture-triage` runs once daily at midnight UTC (`0 0 * * *`) to satisfy Vercel Hobby cron limits. Other crons remain on their existing daily/monthly schedules in `vercel.json`.
- **Graceful degradation:** Gridcore may return `degraded: true` when live utility rate sources are absent; Ironwatch heartbeat may report `HTTP 400` while still returning `200 OK` from the cron handler. These do not block sovereign ingest or Epic 17 telemetry echo.
- **Ironcast email:** `RESEND_API_KEY` is optional for this GA slice; sovereign bus and telemetry stream complete without it (dispatch skipped with console warn). Mount `RESEND_API_KEY` and `THREAT_CONFIRMATION_RECIPIENTS` in production when automated email escalation is required.

---

## 4. Production environment audit checklist

Before closing GA, confirm in **Vercel → Production** (not preview-only):

| Variable | Requirement |
|----------|-------------|
| `DATABASE_URL` / `DIRECT_URL` | Production PostgreSQL (pooler + direct as configured for Prisma). |
| `GOOGLE_API_KEY` | Set for live Gemini / sovereign 19-agent workforce bus. |
| `IRONFRAME_INGEST_BUS_DISABLED` | Unset or not `1` — ingest orchestration bridge must be live. |
| `STAGING_SMOKE_SECRET` / `IRONFRAME_CRON_SECRET` | Set for authenticated internal cron routes in smoke and production cron invocations. |
| `VERCEL_BYPASS_TOKEN` | For protected preview smoke only (local `.env.staging.local`; not required on public production alias). |
| `RESEND_API_KEY` | Optional — Ironcast batch dispatch when email escalation is desired. |

---

## 5. Re-run commands (audit replay)

```powershell
# Local regression (no cloud)
npm run test:unit:epic17
npm run test:integration:epic17

# Cloud edge (skip local PKI / tsc)
$env:STAGING_SMOKE_BASE_URL="https://ironframe-live.vercel.app"
npm run test:vercel-integration:cloud:epic17

# Epic 17 only
npm run test:epic17-orchestration-shadow-smoke
```

---

**Signed posture:** Epic 17 deterministic telemetry stream patching is live on the sovereign orchestration bus, verified locally and on Vercel serverless, with CI green and Hobby deploy unblocked.
