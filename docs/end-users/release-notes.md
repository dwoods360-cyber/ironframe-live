# Release Notes — Ironframe GRC

## v0.1.0-ga-epic17 — June 2, 2026

**Status:** General Availability (GA)

### Highlights
- Epic 17 telemetry stream and `stateDiffer` observability on sovereign ingest
- Cloud integration suite: `--cloud-only` mode; 21/21 cron smoke probes
- CI: Postgres from ECR Public (Docker Hub timeout fix)
- Release evidence: [RELEASE_EVIDENCE_2026-06-02.md](../RELEASE_EVIDENCE_2026-06-02.md)

### Infrastructure
- `health-posture-triage` cron schedule adjusted for Hobby-tier hosting limits
- Ironquery export CSV/PDF probes pass on production edge

---

## Post-GA — June 2026 (main branch)

### fix(ui/ingress): Tenant-switching resilience (`42b9b56b`)
- **CarbonPulse:** SWR cache keyed by tenant UUID (no cross-tenant stale data)
- **Zone normalization:** Rogue hints (e.g. `US-GD`) map to canonical roster zones (e.g. `US-CO`)
- **Credential normalizer:** `LOCAL_RESERVE_BYPASS_TOKEN` when `IRONWATCH_SUSTAINABILITY_FALLBACK_ENABLED=true`
- **LKG routes:** Sustainability stats and carbon-pulse handlers return forensic fallback on error
- **Dashboard:** Preserves last-good snapshot during tenant cache invalidation
- **Middleware:** Strips empty `_api_key=` query noise on sustainability paths

### fix(ops): Electricity Maps API contract (`d8fc6b29`)
- `auth-token` header (not Bearer) for Electricity Maps v3
- Shared client in Ironwatch heartbeat; default zone `US-MIDW-MISO`

### feat(ui): Analyst export dashboard (`87ae6b90`)
- Tenant-scoped CSV/PDF export dashboard and server actions
- Middleware redirect for common exports path typo

### chore(security): Email parameterization (`e119cfd3`)
- Threat notification recipients from env (`THREAT_CONFIRMATION_RECIPIENTS`)

---

## Earlier milestones (summary)

| Area | Change |
|------|--------|
| Epic 16 | Ironquery export API and dashboard scaffolding |
| Epic 12 | WORM policy tests and Supabase storage client |
| Epic 11 | Bank vault dual-gate integration tests |
| Epic 10 | Ingest → sovereign bus bridge |
| UI | Active Risks rename; Audit Intelligence simulation filter |

Full granular history: [Changelog](../technical/changelog.md) and root [CHANGES.md](../../CHANGES.md).

---

## Upgrade notes for operators

1. Set `IRONWATCH_SUSTAINABILITY_FALLBACK_ENABLED=true` on preview/production if Electricity Maps key is absent
2. Restart dev server after `.env.local` changes
3. Run cloud integration verification after deploy
