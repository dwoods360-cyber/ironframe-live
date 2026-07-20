# Quarantine scanner fixture — do not publish

This file lives under `docs/governance-frame/fixtures/`, **not** `docs/briefing-queue/`.

It documents the intentional boot-time quarantine check: IronBoard's `enforceBriefingQuarantine()` emits
`[SECURITY AUDIT] Unauthorized compilation attempt blocked for unvetted draft:` for every non-allowlisted
`.md` file found in `docs/briefing-queue/`.

Unit coverage: `tests/unit/governanceFrameBriefingScanner.test.ts` (uses a temp queue, not this file).

Do not promote, syndicate, or move this into the public research site.
