# Technical Requirements Document (TRD) — Ironframe GRC

Authoritative detail: [TAS.md](../TAS.md). This TRD summarizes architecture, infrastructure, and security for stakeholders.

## System overview

```
[ Browser / Command Center ]
         │
         ▼
[ Next.js 15 App Router — Vercel Edge/Node ]
         │
    ┌────┴────┬──────────────┬─────────────┐
    ▼         ▼              ▼             ▼
 Supabase   Prisma       LangGraph     External APIs
 (Auth+PG)  (ORM)        (19 agents)   (Electricity Maps, Resend, …)
```

## Functional requirements

| ID | Requirement |
|----|-------------|
| FR-01 | Multi-tenant Command Center with cookie/path scoped tenant UUID |
| FR-02 | Threat ingest via Irongate-sanitized DMZ (`/api/threats/ingest`, `/api/ingest`) |
| FR-03 | ALE and mitigated value stored as **BigInt cents** — no float on money paths |
| FR-04 | Sustainability metrics in **physical units** (kWh, gCO₂eq/kWh) |
| FR-05 | Carbon pulse with live + LKG fallback (`/api/sustainability/stats`, `/api/grc/carbon-pulse`) |
| FR-06 | Governance maturity scoring with Ironwatch stale-data mode |
| FR-07 | Analyst exports (CSV/PDF) tenant-scoped via `/dashboard/exports` |
| FR-08 | Scheduled crons (Ironwatch heartbeat, gridcore rate poll, health triage) |
| FR-09 | Simulation / shadow plane isolated from production audit writes |

## Non-functional requirements

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-01 | Availability (Command Center) | 99.5%+ |
| NFR-02 | Tenant isolation | Zero cross-tenant reads/writes |
| NFR-03 | API auth | Supabase session + internal cron secrets |
| NFR-04 | Build gate | `npm run build` + lint green on main |
| NFR-05 | Integration gate | Vercel cloud suite pass before promote |
| NFR-06 | Audit logging | Structured server logs + Prisma audit tables |

## Infrastructure

| Layer | Technology |
|-------|------------|
| Hosting | Vercel (Preview + Production) |
| Database | Supabase PostgreSQL |
| ORM | Prisma 6.x |
| Auth | Supabase SSR (`@supabase/ssr`) |
| Email | Resend / Nodemailer (Ironcast) |
| Storage | Supabase buckets (WORM policy — Epic 12) |
| CI | GitHub Actions (Postgres 15 service, epic integration matrices) |
| Cron | Vercel Cron (`vercel.json`) |

## Security requirements

1. **Ironguard (Agent 12)** — `x-tenant-id` / cookie alignment; cross-tenant fetch throws
2. **Irongate (Agent 14)** — No raw external payload to DB without sanitization
3. **RLS** — Postgres row-level security per tenant
4. **Secrets** — `.env.example` blueprint; no credentials in repo (`scan:secrets` pre-test)
5. **PKI vault (Epic 11)** — Dual-gate bank vault; supervisor public keys in env
6. **Stale lockdown** — Sustainability API degraded ≥24h triggers mutation freeze (tripartite waiver path)
7. **Middleware** — Session refresh, quarantine paths, sustainability `_api_key` sanitizer

## Environment variables (critical)

See `.env.example`. Minimum production set:

- `DATABASE_URL`, Supabase URL/keys
- `IRONFRAME_CRON_SECRET` / `IRONFRAME_INTERNAL_GATES_SECRET`
- `ELECTRICITY_MAPS_API_KEY` (or `IRONWATCH_SUSTAINABILITY_FALLBACK_ENABLED=true` for staging)
- `RESEND_API_KEY` (Ironcast — optional in sandbox)

## Testing requirements

| Suite | Command |
|-------|---------|
| Unit | `npm test` |
| Epic integration | `npm run test:integration:epic{12,13,15,16,17}` |
| Sustainability | `npm run test:integration:sustainability` |
| Cloud smoke | `npm run test:vercel-integration:cloud:epic17` |

## Related documents

- [TAS.md](../TAS.md)
- [DOCS_OPERATIONS.md](../../DOCS_OPERATIONS.md)
- [Security & Compliance](../technical/security-and-compliance.md)
- [API Documentation](../technical/api-documentation.md)
