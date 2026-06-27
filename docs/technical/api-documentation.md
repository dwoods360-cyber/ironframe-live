# API Documentation — Ironframe GRC

Overview of public and internal HTTP APIs. All tenant-scoped routes require Supabase session unless noted.

## Authentication

| Method | Usage |
|--------|--------|
| **Supabase session cookie** | Browser and same-origin `fetch` |
| **`x-tenant-id` header** | Set by `tenantFetch` / Ironguard client |
| **`Authorization: Bearer`** | Cron and internal gates (`IRONFRAME_CRON_SECRET`, simulation secret) |

## Core dashboard

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/dashboard` | Command Center aggregate payload (tenant-scoped) |
| GET | `/api/health` | Liveness probe |

## Threats and risks

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/threats` | Threat list |
| GET | `/api/threats/active` | Active threats |
| POST | `/api/threats/ingest` | Ack/orchestration for existing threat (`threatId` required) |
| POST | `/api/ingestion/endpoint-compliance` | Typed MDM/EDR/SIEM endpoint compliance ingress ([schema](./endpoint-compliance-ingress-schema.md)) |
| POST | `/api/ingestion/raw-signal` | Loose envelope raw signal (Irongate → Ironcore routing) |
| POST | `/api/ingest` | Legacy alias → `/api/ingestion/raw-signal` |
| GET | `/api/threat-events-heatmap` | Heatmap data |
| GET/POST | `/api/threats/[id]` | Single threat |
| POST | `/api/threats/[id]/neutralize` | Neutralize threat |

## Sustainability (Ironbloom)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/sustainability/stats` | Carbon pulse + financial bundle (60s poll) |
| GET | `/api/sustainability/pulse-lkg` | Last-known-good pulse offline bundle |
| GET | `/api/sustainability/ironbloom` | Ironbloom service surface |
| GET | `/api/grc/carbon-pulse` | GRC carbon pulse (mirrors stats) |
| GET | `/api/grc/carbon-pulse/evidence` | Forensic manifest by `artifactId` |

**Query hygiene:** Empty `_api_key=` stripped by middleware; use env fallback when configured.

## GRC and governance

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/grc/governance-maturity` | Maturity snapshot |
| GET | `/api/grc/compliance-drift` | Drift metrics |
| GET | `/api/grc/irontally` | Control framework tally |
| GET | `/api/grc/tas-integrity` | Constitutional integrity (200/503) |
| GET | `/api/grc/tas-constitution` | TAS constitution payload |
| GET | `/api/grc/security-posture` | Security posture summary |
| POST | `/api/grc/sustainability-stale-lockdown-waiver` | Tripartite stale waiver |
| POST | `/api/grc/constitutional-override` | Break-glass override |
| POST | `/api/grc/constitutional-restoration` | Restoration flow |

## Audit and exports

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/audit/intelligence-feed` | Audit intelligence stream |
| GET | `/api/audit/ledger-feed` | Ledger feed |
| GET | `/api/audit/export` | Audit export |
| GET | `/api/ironquery/export` | Ironquery analyst export |
| GET | `/api/internal/ironquery/export` | Internal token-gated export |

## Ironwatch

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/ironwatch/layout-signal` | Global freeze + quarantine flags |
| POST | `/api/ironwatch/human-ack-anomaly` | Human anomaly acknowledgment |

## Internal cron (Bearer secret)

| Path | Purpose |
|------|---------|
| `/api/internal/cron/ironwatch-api-heartbeat` | Electricity Maps heartbeat |
| `/api/internal/cron/gridcore-rate-poll` | Utility rate poll |
| `/api/internal/cron/health-posture-triage` | Health posture triage |
| `/api/internal/cron/ironscribe-daily-audit` | Daily audit synthesis |
| `/api/internal/cron/ironsight-regulatory-poll` | Regulatory poll |
| `/api/internal/cron/carbon-budget-reallocation` | Carbon budget |
| `/api/internal/cron/sustainability-achievement-report` | Achievement report |

## Response conventions

```json
{ "ok": true, "pulse": { ... }, "source": "electricity-maps" }
{ "ok": false, "error": "No active tenant." }
```

- Financial fields: stringified BigInt cents in JSON
- Carbon intensity: number (gCO₂eq/kWh)
- Errors: prefer 200 + `ok: false` for UI routes where LKG applies; 503 when no fallback

## Client usage

```typescript
import { ironguardFetch } from "@/app/utils/apiClient";

const res = await ironguardFetch("/api/sustainability/stats", { cache: "no-store" });
const json = await res.json();
```

Tenant-scoped SWR keys should include tenant UUID (see CarbonPulse component).

## Environment reference

Full variable list: `.env.example`  
Operations: [DOCS_OPERATIONS.md](../../DOCS_OPERATIONS.md)

## Related documents

- [Security & Compliance](./security-and-compliance.md)
- [Error Messages](../support/error-messages.md)
- [TAS.md](../TAS.md)
