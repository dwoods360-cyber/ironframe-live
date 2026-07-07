# Ironleads — isolated OSINT lead harvester

Decoupled from Ironframe (:3000) and IronBoard (:8082). Writes volatile data to local SQLite; ships sanitized leads to Ironframe ingress only.

## Quick start

```bash
cd Ironleads
npm install
npm run db:generate
npm run db:push
npm run dev
```

Server: `http://127.0.0.1:8083`

## Environment (`Ironleads/.env.local`)

```env
IRONLEADS_PORT=8083
IRONLEADS_DATABASE_URL="file:./data/ironleads.db"
IRONLEADS_INGRESS_BASE_URL=http://127.0.0.1:3000
IRONLEADS_INGRESS_SECRET=<same as Ironframe IRONLEADS_INGRESS_SECRET>
IRONLEADS_TARGET_TENANT_SLUG=medshield
IRONLEADS_HARVEST_CRON_ENABLED=false
```

## Agents

| Agent | Role |
|---|---|
| LeadScout (L-01) | Fetch allowlisted OSINT → `raw_scraped_signals` |
| SignalFilter (L-02) | Deterministic extraction → `qualified_leads` |
| LeadGatekeeper (L-03) | Sanitize + POST `/api/v1/ingress/ironleads` |

## CLI

```bash
npm run harvest -- --fixtures-only --skip-ingress
```

## API

- `GET /health`
- `GET /api/knowledge` — lead-gen corpus search
- `GET /api/knowledge/:id`
- `POST /api/harvest` — run full cycle (`scoutOnly`, `skipIngress`, `sourceIds`)
