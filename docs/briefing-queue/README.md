# Briefing queue — draft quarantine & promotion runbook

Drafts in `docs/briefing-queue/` are **never** compiled to the public Governance Frame surface (`research.ironframegrc.com`, legacy `brief.ironframegrc.com`, `/gf-research`, `/governance-frame`, Ironcast email, RSS, or the marketing briefings archive). Only `docs/published-briefings/*.md` enters the publication pipeline.

**Single promote path:** Ops Hub Approve → Postgres + filesystem published ledger → Governance Frame / RSS / Ironcast **and** marketing cards at `/resources/briefings` (metadata projection only — title, date, one-liner, link to Frame). Marketing never reads this queue.

## Autonomous authorship (quarantine only)

Weekday cron stages **one public briefing + one Ironcast newsletter** into this queue without publishing:

| Trigger | Schedule | Entry |
|---------|----------|--------|
| Windows | **04:00** Mon–Fri local | `scripts/cron_gtm_briefing_queue_scheduled.ps1` → `POST /api/cron/gtm-briefing-queue` |
| Vercel | **04:00** UTC Mon–Fri | `vercel.json` → same route |

- Filenames: `YYYY-MM-DD-draft-auto-briefing-{topic}.md` / `…-auto-newsletter-{topic}.md`
- Rotating topics (heatmap vs dollars, tenant sovereignty, design-partner cohort, evidence pain, category split)
- Skip if today’s files already exist
- Disable: `GTM_BRIEFING_QUEUE_CRON_ENABLED=false`
- Prefer **local Core** (`http://127.0.0.1:3000`) so queue files persist in this repo (Vercel FS is ephemeral)

**Operator gate:** Ops Hub → Briefings → **Promote** (approve / publish) or **Deny** (move to `briefing-queue/denied/`).

## What quarantine guarantees

- Queue files trigger `[SECURITY AUDIT] Unauthorized compilation attempt blocked for unvetted draft:` warnings at scan time.
- Ironcast, Governance Frame Hub, and RSS ingest **published** markdown only.
- Draft markdown is not rendered on any public route.

## Human-in-the-loop promotion

1. **Author** — Autonomous GTM cron, Ops Hub **Request series** (Briefings or Newsletters), stage paste, nightly narrate (telemetry triad), or a human file using `template.md`.  
   **Not** IronBoard chat alone (read-only) and **not** board-writer (APP_DOCS plane only).
2. **Filename convention:** `YYYY-MM-DD-draft-{slug}.md` (e.g. `2026-01-15-draft-market-grc-2000-2008.md`).
3. **Section V required:** Every draft must end with `### V. Sources & Citations` so reviewers can trace claims to approved sources.
4. **Show, don’t tell:** Open in scene; price in **USD** (no cents companions in body); put machine gates in the same room as the failure. Industry voice only—no product/brand CTAs. Ban meta narration (“what this section is,” “story beat,” “how to read it”). Follow `template.md`.
5. **Review** — Ops Hub → Briefings → verify citations. Reject drafts containing raw CVEs, UUIDs in body copy, or unsanitized claims.
6. **Approve** — Ops Hub Promote & syndicate, or:

```bash
npx tsx scripts/promote-briefing-draft.ts --file 2026-01-15-draft-market-grc-2000-2008.md --slug 2026-01-15-market-grc-2000-2008
```

7. **Deny** — Ops Hub Deny (Postgres denial receipt + remove from active queue).
8. **Publish compile** — after promotion, run Ironcast / RSS compile against `published-briefings/` only.

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
