# Get Started Welcome — Audio Script (Level 1)

**Author:** board-writer (Narrative Architect), blueprint by board-trainer
**Generated:** 2026-07-15T13:20:00.000Z
**Synthesis:** llm
**Ingress:** docs/end-users/onboarding.md, docs/user-manuals/design-partner-operator-packet.md, app/lib/getStartedSteps.ts, lib/ironframeProductKnowledge/commercial.ts
**Plays:** Once on first visit to `/get-started`, before guided step narration

---

## Production notes

| Item | Value |
|------|--------|
| **Script path (this file)** | `docs/user-manuals/get-started-welcome-audio-script.md` |
| **Regenerate** | Edit this file · then `npm run synthesize:get-started-audio` |
| **Save your audio here** | `public/training-audio/get-started-welcome.mp3` |
| **Regenerate audio** | `npm run synthesize:get-started-audio` |
| **Env var (optional override)** | `NEXT_PUBLIC_GET_STARTED_WELCOME_AUDIO_URL=/training-audio/get-started-welcome.mp3` |
| **Portal surface** | `/get-started` — welcome audio plays before step narration |

**Tone:** Warm, brief, operator-facing. One shared Ironframe welcome for all tenants — no company names in audio.

**Platform scope:** Personalize in UI only (workspace banner, tenant slug). Do not record per-customer welcome audio.

**Bucket B only:** No invite, password, legal checkbox, or billing copy.

---

## Script

### [0:00] Welcome

Welcome to Ironframe. Your workspace is now active. You have successfully signed in as an operator. You are on the paid design partner Path B Command Tier seat at four thousand nine hundred ninety-nine dollars.

Pause two seconds.

source-file: docs/end-users/onboarding.md
source-file: lib/ironframeProductKnowledge/commercial.ts

### [0:20] What happens next

This brief welcome plays once. It prepares you for your guided training. You will soon begin the Get Started checklist. That includes workspace orientation from the Design Partner Operator Packet, Integrity Hub and ALE baselines, the curated partner training track, and the Exports console for auditor handoff.

Pause one second.

source-file: docs/user-manuals/design-partner-operator-packet.md
source-file: app/lib/getStartedSteps.ts

### [0:45] Close

Take a moment to settle in. Your first guided step will begin shortly. You can replay this welcome or any training narration from the Get Started portal.

source-file: docs/end-users/onboarding.md

---

## Verification before publish

- [ ] Audio file at `public/training-audio/get-started-welcome.mp3`
- [ ] Mentions partner packet / partner training — not classroom-only framing
- [ ] Mentions Path B Command Tier at four thousand nine hundred ninety-nine dollars
- [ ] Hard refresh `/get-started` on a fresh browser profile — welcome plays once before step audio

source-file: docs/end-users/onboarding.md
ref: design-partner-docs-packet · emittedAt=2026-07-15T13:20:00.000Z
