# Briefing queue — draft quarantine & promotion runbook

Drafts in `docs/briefing-queue/` are **never** compiled to the public Governance Frame surface (`brief.ironframegrc.com`, `/governance-frame`, Ironcast email, or RSS). Only `docs/published-briefings/*.md` enters the publication pipeline.

## What quarantine guarantees

- Queue files trigger `[SECURITY AUDIT] Unauthorized compilation attempt blocked for unvetted draft:` warnings at scan time.
- Ironcast, Governance Frame Hub, and RSS ingest **published** markdown only.
- Draft markdown is not rendered on any public route.

## Human-in-the-loop promotion

1. **Author** — Ops Hub **Request series** (`POST /api/admin/operations-hub/briefings/request`) or stage paste (`POST /api/admin/operations-hub/briefings/stage`), nightly narrate cron, or a human file using `template.md`.  
   **Not** IronBoard chat alone (read-only) and **not** board-writer (APP_DOCS plane only).
2. **Filename convention:** `YYYY-MM-DD-draft-{slug}.md` (e.g. `2026-07-14-draft-market-grc-2000-2008.md`).
3. **Section V required:** Every draft must end with `### V. Sources & Citations` so reviewers can trace claims to approved sources.
4. **Review** — Ops Hub → Briefings → verify citations. Reject drafts containing raw CVEs, UUIDs in body copy, or unsanitized claims.
5. **Promote** — Ops Hub Promote & syndicate, or:

```bash
npx tsx scripts/promote-briefing-draft.ts --file 2026-07-14-draft-market-grc-2000-2008.md --slug 2026-07-14-market-grc-2000-2008
```

6. **Publish compile** — after promotion, run Ironcast / RSS compile against `published-briefings/` only.

## Draft validation rules

| Check | Queue (warn) | Promotion (block) |
|-------|----------------|-------------------|
| Triad sections I–III | warn | error |
| Section V citations | warn | error |
| Exposure ≥ `INTERNAL_ALERT_EXPOSURE_THRESHOLD_CENTS` | warn (`EXPOSURE_THRESHOLD_EXCEEDED`) | warn |
| Raw `CVE-YYYY-NNNN` | warn | error |
| Raw UUID literals | warn | — |
| Executable HTML / `javascript:` | error | error |
| Filename convention | warn | warn |

## Risks (operational)

- **Confidentiality:** Drafts in git, backups, and PRs may contain sensitive figures — treat queue like internal-only documentation.
- **Mistaken promotion:** The weakest link; always use `promote-briefing-draft.ts` and require Section V review.
- **False sense of safety:** Queue ≠ approved; board output ≠ publication-ready.

## Board citation format

```markdown
### V. Sources & Citations

- **[1] Label** — `locator` · retrieved 2026-06-17 · optional reviewer note
```

Nightly narrate (`POST /api/cron/narrate`) appends deterministic telemetry citations when the model omits Section V and writes quarantined drafts to `briefing-queue/` with `requiresImmediatePromotion` when active tenant exposure (whole cents) meets or exceeds `INTERNAL_ALERT_EXPOSURE_THRESHOLD_CENTS` (default `5000000` = $50,000.00 USD).
