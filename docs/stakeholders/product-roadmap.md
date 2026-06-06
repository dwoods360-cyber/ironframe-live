# Product Roadmap — Ironframe GRC

High-level delivery plan aligned with [GA Open Roadmap](/docs/GA_OPEN_ROADMAP) and repository-root `EPIC_STATUS.md` (not served by the docs viewer).

## Shipped (GA baseline — June 2026)

| Epic | Capability | Status |
|------|------------|--------|
| Epic 4 | Ironwave executive telemetry | Closed |
| Epic 6 | Threat state machine | Closed |
| Epic 7 | Ironcast notifications (Resend) | Closed |
| Epic 8 | Governed liability / impact chips | Closed |
| Epic 10 | Sovereign orchestration bus + ingest bridge | ~90% |
| Epic 11 | Bank Vault PKI dual-gate | ~95% |
| Epic 16 | Analyst export dashboard (`/dashboard/exports`) | Shipped |
| Epic 17 | Telemetry stream + state differ | GA (`v0.1.0-ga-epic17`) |
| — | Tenant-switch resilience (SWR, zone normalization, LKG) | Shipped (`42b9b56b`) |

## P0 — Release-blocking (current quarter)

| Epic | Milestone | ETA | Owner |
|------|-----------|-----|-------|
| Epic 11 | Production PKI keys in Vercel; vault CI required on PR | Done / maintain | Security |
| Epic 13 | Cron GET handlers + `vercel.json` schedules | Done / maintain | DevOps |
| Epic 9/5 | Live `ELECTRICITY_MAPS_API_KEY` + `IRONWATCH_SUSTAINABILITY_FALLBACK_ENABLED` parity | In progress | Data Integration |

## P1 — Next sprint

| Epic | Milestone | ETA |
|------|-----------|-----|
| Epic 10 | Full 19-agent roster on sovereign bus | 2026-06-03 |
| Epic 12 | WORM object-lock; shredder block on attestation | 2026-06-05 |
| Epic 15 | Checkpoint pool runbooks; CI `DATABASE_URL` locks | 2026-06-08 |

## P2 — Product polish

| Epic | Milestone | ETA |
|------|-----------|-----|
| Epic 16 | Branded PDF/CSV Ironquery packs (full parity) | 2026-06-12 |
| Epic 14 | Ironethic DEI salted pipeline (No-PII ingest) | 2026-06-16 |

## H2 2026 (directional)

- **Battle Lab** — Adversary simulation hardening ([BATTLE_LAB_ROADMAP.md](../BATTLE_LAB_ROADMAP.md))
- **Investor reporting** — GRC investor report download flows (API scaffold exists)
- **Vendor risk rebuild** — Role-based report pages under `doc/rebuild/`
- **Multi-region** — Read replicas and edge cache strategy for enterprise tenants

## How to read epic percentages

Percentages in EPIC_STATUS reflect **feature-complete vs GA hardening** (production keys, cron, WORM, CI gates)—not UI mock completeness.

## Related documents

- [Product Vision](/docs/stakeholders/product-vision)
- [Release Notes](/docs/end-users/release-notes)
- [Changelog](/docs/technical/changelog)
