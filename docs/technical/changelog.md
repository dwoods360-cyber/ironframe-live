# Changelog — Ironframe GRC

Structured release history. Granular session log: [CHANGES.md](../../CHANGES.md).

## [Unreleased]

### Added
- Documentation hub under `docs/` (stakeholder, user, support, sales, marketing, technical)

---

## [0.1.0-ga-epic17] — 2026-06-02

### Added
- Epic 17 telemetry stream on sovereign ingest path
- `stateDiffer` unit gates (float blocked, tenant-scoped keys)
- Cloud integration `--cloud-only` mode
- Release evidence pack: [RELEASE_EVIDENCE_2026-06-02.md](../RELEASE_EVIDENCE_2026-06-02.md)

### Fixed
- CI Postgres image from ECR Public (Docker Hub timeouts)

### Infrastructure
- `health-posture-triage` cron schedule for Vercel Hobby tier

**Tag:** `v0.1.0-ga-epic17` @ `4ee77261`

---

## [Post-GA main] — 2026-06

### Fixed — Tenant-switch resilience (`42b9b56b`)
- Scoped CarbonPulse SWR keys by tenant UUID
- Electricity Maps credential normalizer + `LOCAL_RESERVE_BYPASS_TOKEN`
- Zone alias normalization (`US-GD` → `US-CO`)
- LKG fallbacks on sustainability stats and carbon-pulse routes
- Dashboard LKG during tenant cache invalidation
- Middleware empty `_api_key` sanitizer
- Ironwatch heartbeat bypass short-circuit

### Fixed — Electricity Maps contract (`d8fc6b29`)
- `auth-token` header for Electricity Maps v3 API

### Added — Analyst exports (`87ae6b90`)
- `/dashboard/exports` route and server actions

### Changed — Security (`e119cfd3`)
- Parameterized threat notification email recipients

---

## Prior milestones (abbreviated)

| Date | Scope |
|------|--------|
| 2026-05 | Epic 10 ingest bus bridge, sovereign orchestration |
| 2026-05 | Epic 11 bank vault UI and PKI tests |
| 2026-05 | Epic 12 WORM policy unit/integration tests |
| 2026-05 | Epic 13 telemetry triage cron |
| 2026-02 | Active Risks rename; Audit Intelligence simulation filter |

## Versioning policy

- **GA tags:** `v0.1.0-ga-epic{N}` aligned to epic trains
- **Main branch:** continuous delivery to Vercel production on merge
- **Breaking changes:** require TAS amendment + migration notes in [Release Notes](../end-users/release-notes.md)

## Related documents

- [Release Notes](../end-users/release-notes.md)
- [Product Roadmap](../stakeholders/product-roadmap.md)
- [CHANGES.md](../../CHANGES.md)
