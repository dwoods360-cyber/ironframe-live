# Control-First GRC — Series Index

**Series ID:** `control-first-grc`  
**Authoritative plan:** `app/api/admin/operations-hub/briefings/request/route.ts` (`DEFAULT_SERIES_TITLE`, `DEFAULT_ERAS`)  
**Publication class:** Industry briefing (public thought leadership)  
**Canonical package root:** `docs/governance-frame/briefings/series/control-first-grc/`

## Series title

Control-first GRC: how financial-risk defensibility replaced checklist compliance, 2000–2026

## Installments

| Installment | Package ID | Era | Year range | Published slug | Status |
|---|---|---|---|---|---|
| Part 1 | `CF-GRC-2026-01` | Checklist foundations | 2000–2008 | `2026-01-15-market-grc-2000-2008` | PUBLISHED |
| Part 2 | `CF-GRC-2026-02` | Cloud migration and the checklist industrial complex | 2009–2018 | `2026-02-12-market-grc-2009-2018` | PUBLISHED |
| Part 3 | `CF-GRC-2026-03` | Quantitative GRC and governed automation | 2019–today | `2026-03-12-market-grc-2019-today` | PUBLISHED |

## Required files per installment

Each installment package under `CF-GRC-2026-0N/` must include:

1. `manuscript.md` — canonical manuscript (YAML frontmatter + body)
2. `references.md` — reference ledger extracted from Section V
3. `source-ledger.md` — claim-to-source verification ledger
4. `revision-history.md` — version and review history
5. `editorial-review-notes.md` — collaborative review notes
6. `installment-metadata.md` — series position, published slug, lifecycle status

## Operational mirror vs authoritative publish store

- **Authoritative published ledger:** PostgreSQL `published_briefings` (Governance Frame reader).
- **Filesystem operational mirror:** `docs/published-briefings/{slug}.md` (RSS / Ironcast compile helpers).
- Repository packages in this directory remain the editorial source of truth for manuscripts and verification ledgers.

**Publication status check (2026-07-16):** Parts 1–3 are **present in `published_briefings`** (not mirror-only). They were operator-promoted (`ops-hub-repair` / Ops Hub operator UUID), not auto-cron published. Classification on mirrors is `Institutional Governance` (public-eligible), not INTERNAL/STAGING.

## Quarantined Drafts (Ops Hub)

Quarantine is a **filesystem desk**, not a separate Postgres draft table. Ops Hub lists `docs/briefing-queue/*.md`; hold/deny overlays live in `briefing_queue_holds` / `briefing_queue_denials`.

Operator-facing quarantine copies still on disk (hidden from Approve when the published slug already exists):

| Installment | Quarantined Draft path |
|---|---|
| Part 1 | `docs/briefing-queue/2026-01-15-draft-market-grc-2000-2008.md` |
| Part 2 | `docs/briefing-queue/2026-02-12-draft-market-grc-2009-2018.md` |
| Part 3 | `docs/briefing-queue/2026-03-12-draft-market-grc-2019-today.md` |

Each queue draft sets `status: QUARANTINED_DRAFT`, `publishState: QUARANTINED_AWAITING_OPERATOR`, and `requiresImmediatePromotion: false`. Staging into the queue does **not** by itself promote, expose, or mark approved.

## Related long-form research

Institutional research paper **GF-2026-001** (`docs/governance-frame/research-papers/GF-2026-001-evolution-of-grc/`) synthesizes the same historical arc in long-form academic prose.
