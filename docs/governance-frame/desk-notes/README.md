# Desk notes (weekly signals)

Short, dated Governance Frame publications on **one** live development.

## Cadence

| Slot | UTC | Job |
|------|-----|-----|
| **Tuesday 18:00** | Publish / Approve one desk note | Avoids LinkedIn Mon/Wed/Fri and video Fri 16:00 |
| **Monday 17:00** | Research next industry signal | Starts **after** the staged backlog is published |

- **Phase 1 (backlog):** Approve existing `*-draft-desk-note-*` queue items one per Tuesday (Ops Calendar seeded from 2026-08-18).
- **Phase 2 (ongoing):** Each Monday research one live primary-source signal; stage quarantine draft; Tuesday Approve.
- Not a substitute for monthly **briefings** or **newsletters** — distinct lead topic each month.
- Event-driven extras only when a primary source moves faster than the weekly slot (still prefer Tue; never steal video Friday).

Ops Calendar seed: `deskNotesCadence2026SeedSpecs()` in `app/lib/opsScheduleSeedSpecs.ts`.

## Rules
1. Single claim / single development — stay short.
2. Always dated; distinguish what happened from what is proposed.
3. Quarantine → human Approve (same ledger path as briefings).
4. If depth is required, graduate the topic to the monthly briefing — do not inflate the desk note.
5. Frontmatter: `category: desk-note` (or title prefix `Desk Note —` / `Signal —`), plus `tenantId` / `tenantSlug` for the GTM publish tenant (default `ironframe-sandbox`).
6. Queue filenames: `*-draft-desk-note-*` or `*-draft-signal-*`.
7. **Publication date = signal week / event day on the note**, never Approve-day “today”. Prefer frontmatter `published:` (YYYY-MM-DD) matching the filename date prefix; promote stamps `publishedAt` / ledger `createdAt` from that day. Public indexes prefer the slug/filename week over any Approve-day stamp.
8. Promote-path sections (short form): **What moved**, **Governance implication**, **V. Sources & Citations**. Full triad I–III is optional, not required.
9. CVE identifiers are permitted on desk notes when they are the public catalog key (e.g. CISA KEV) — monthly triad briefings still forbid raw CVE tokens.

## Public surface

- Index: `research.ironframegrc.com/desk-notes`
- Publishing Desk tab: **Desk notes**
