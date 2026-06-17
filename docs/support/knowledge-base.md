# Knowledge Base — Ironframe GRC

Central index of support articles. Link users to [FAQ](../end-users/faq.md) for self-service first.

## Getting started

| Article | Link |
|---------|------|
| First login and tenant switcher | [Onboarding](../end-users/onboarding.md) |
| Command Center tour | [User Guide](../end-users/user-guide.md) |
| Release highlights | [Release Notes](../end-users/release-notes.md) |

## Authentication and access

| Topic | Detail |
|-------|--------|
| Supabase login | Required for tenant routes; middleware refreshes session |
| Tenant cookie | `ironframe-tenant` — UUID, 180-day max-age, SameSite=Lax |
| Ironguard session | Client effective tenant; must align with cookie on fetch |
| Global vs scoped | Global Command Center = aggregate; exports need scoped tenant |

## Dashboard and UI

| Topic | Detail |
|-------|--------|
| Blank panels after tenant switch | Fixed in `42b9b56b` — refetch without clearing LKG; refresh if persistent |
| Handshake phases | idle → verified; shadow plane may auto-verify |
| Active Risks vs Pipeline | Pipeline = intake; Active = confirmed triage |
| Audit Intelligence filters | SIMULATION and GRCBOT hidden from sidebar |

## Sustainability (Ironbloom / Ironwatch)

| Topic | Detail |
|-------|--------|
| Carbon pulse poll interval | 60 seconds via SWR |
| LKG path | `/api/sustainability/pulse-lkg` |
| Fallback env | `IRONWATCH_SUSTAINABILITY_FALLBACK_ENABLED=true` |
| Zone roster | Medshield US-NEIS, Vaultbank US-NY, Gridcore US-CO, Defense US-MIDA-PJM |
| Rogue zone aliases | US-GD → US-CO (Gridcore) |
| Stale data mode | Ironwatch 4h degraded → maturity penalty + lockdown paths |

## Exports and evidence

| Topic | Detail |
|-------|--------|
| Analyst exports | `/dashboard/exports` |
| API export | `/api/ironquery/export`, `/api/internal/ironquery/export` |
| WORM seal | Epic 12 — attestation blocks shredder |
| Forensic manifest | Carbon pulse → Forensic button → evidence API |

## Operations and cron

| Cron route | Purpose |
|------------|---------|
| `/api/internal/cron/ironwatch-api-heartbeat` | Electricity Maps ping |
| `/api/internal/cron/gridcore-rate-poll` | Utility rate poll |
| `/api/internal/cron/health-posture-triage` | Telemetry triage |
| `/api/internal/cron/ironscribe-daily-audit` | Daily audit synthesis |
| `/api/cron/narrate` | Governance Frame triad snapshot → board `narrativeCache` (Vercel `30 3 * * *` UTC; local task 03:30) |

Auth: `Authorization: Bearer $IRONFRAME_CRON_SECRET` or internal gates secret.

| Runbook | Purpose |
|---------|---------|
| **[Nightly Cron Runbook](../operations-support/nightly-cron-runbook.md)** | Windows **Documentation Engine** (03:00 Task Scheduler, Cursor CLI, glossary) vs **API narrate** (Core/Vercel); env vars, log paths, success criteria |

Local Windows tasks: `\Ironframe Daily Documentation Engine` (03:00) + `\Ironframe GRC Narrative Hydration` (03:30) — register via `scripts\register-nightly-cron-tasks.ps1` (see runbook).

## Engineering references

| Doc | Audience |
|-----|----------|
| [TAS.md](../TAS.md) | Architecture authority |
| [testing.md](../testing.md) | CI matrices |
| [API Documentation](../technical/api-documentation.md) | Integrators |
| [Security & Compliance](../technical/security-and-compliance.md) | Audit/security |

## Related documents

- [Support Guide](./support-guide.md)
- [Error Messages](./error-messages.md)
