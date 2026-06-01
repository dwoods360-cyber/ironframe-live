# Ironframe Runtime Orchestration Pipeline: Operational Runbook

This document details the operational mechanics of the Ironframe multi-agent data ingestion architecture. The platform features an isolated, dual-path telemetry framework that allows systems administrators to toggle core processing paths instantly via global environment configurations without modifying underlying source binaries.

---

## Core routing topologies: Path A vs. Path B

The behavior of the unified `ingestBusBridge` and the downstream multi-tenant data pipelines is dictated by the `IRONFRAME_INGEST_SOVEREIGN_BUS` environment variable at the runtime edge.

```
              [ Incoming Telemetry Payload Ingress ]
                                │
              ┌─────────────────┴─────────────────┐
              ▼                                   ▼
[ Path A: Sovereign Bus Overdrive ]   [ Path B: Forensic Graph Default ]
• IRONFRAME_INGEST_SOVEREIGN_BUS=1    • IRONFRAME_INGEST_SOVEREIGN_BUS=0
• Linear sequence                     • Advanced multi-agent scoring
• Direct transactional execution      • Forensic dependency graph
• Strict deterministic baseline       • Dynamic threat blast-radius mapping
```

### Path A: Sovereign Bus Overdrive (default when set to `1`)

- **Environment variable:** `IRONFRAME_INGEST_SOVEREIGN_BUS=1`
- **Behavior:** Standard telemetry routes through a fast, linear sovereign transactional pipeline. Deterministic constraints and high-integrity baseline processing.
- **Opt-in multi-agent analytics:** Append `useForensicGraph: true` on the ingest payload to invoke the full forensic graph on demand.

### Path B: Advanced multi-agent forensic graph

- **Environment variable:** `IRONFRAME_INGEST_SOVEREIGN_BUS=0` or unset (forensic graph is the default lane in code unless sovereign bus is forced)
- **Behavior:** Promotes the multi-agent workforce (`Ironcore`, `Ironsight`, `Ironlogic`, and related specialists) for ingest orchestration: scoring, policy-to-rule parsing, and forensic graph extraction at the edge.

---

## Administrative state controls

### 1. Promoting the fleet to Path B (global forensic graph)

Remove the linear override from production edge variables, then redeploy:

```bash
npx vercel env rm IRONFRAME_INGEST_SOVEREIGN_BUS production --yes
npx vercel --prod --yes
```

### 2. Enforcing core transaction timeouts

The edge proxy enforces a strict acknowledgment window to protect the multi-tenant pool from `25P02` deadlocks. Re-verify or roll out constraint changes with a clean production deploy:

```bash
npx vercel --prod --yes
```

### 3. Isolated integration verification loop

Verify RLS posture, schema, and PKI validations against production without polluting customer rows:

```bash
npm run test:production-compliance-ingest
```

A successful run returns telemetry confirming an active `rlsPolicyCount` posture (expected baseline: **5**).

---

## Local development and CI

| Concern | Command / note |
|--------|----------------|
| Prisma client after Windows file locks | Kill Node on port 3000, `npx prisma generate`, then `npm run dev` |
| Stale CI `DATABASE_URL` in shell | Use `npm run dev` (loads `.env` with override via `scripts/preload-local-env.cjs`) or open a fresh terminal |
| Constitutional integrity probe | `Invoke-RestMethod http://localhost:3000/api/grc/tas-integrity` — expect **200** (healthy) or structured **503** (constitutional emergency) |
| GitHub Actions database | Ephemeral **Postgres 15** service + `scripts/ci-bootstrap-postgres.mjs` in Ironframe CI, Sovereign Deploy, and Playwright workflows |

See `.env.example` for the full environment blueprint.
