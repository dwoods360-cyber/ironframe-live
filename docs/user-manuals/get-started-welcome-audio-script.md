# Get Started Welcome — Audio Script (Level 1)

**Author:** board-writer (Narrative Architect), blueprint by board-trainer
**Generated:** 2026-06-25T18:53:22.637Z
**Synthesis:** llm
**Ingress:** docs/end-users/onboarding.md, app/lib/getStartedSteps.ts
**Plays:** Once on first visit to `/get-started`, before guided step narration

---

## Production notes

| Item | Value |
|------|--------|
| **Script path (this file)** | `docs/user-manuals/get-started-welcome-audio-script.md` |
| **Regenerate** | `npm run docs:welcome-audio-script` |
| **Save your audio here** | `public/docs/training/assets/get-started-welcome.mp3` |
| **Env var (optional override)** | `NEXT_PUBLIC_GET_STARTED_WELCOME_AUDIO_URL=/docs/training/assets/get-started-welcome.mp3` |
| **Portal surface** | `/get-started` — welcome audio plays before step narration |

**Tone:** Warm, brief, operator-facing. One shared Ironframe welcome for all tenants — no company names in audio.

**Platform scope:** Personalize in UI only (workspace banner, tenant slug). Do not record per-customer welcome audio.

**Bucket B only:** No invite, password, or legal checkbox copy.

---

## Script

### [0:00] Welcome
Welcome to Ironframe. Your workspace is now active. You have successfully signed in as an operator.
Pause two seconds.

source-file: docs/end-users/onboarding.md

### [0:20] What happens next
This brief welcome plays once. It prepares you for your guided training. You will soon begin the Get Started checklist. This includes Command Post orientation, primary control areas, and initial dashboard review. You will also learn about audit exports.
Pause one second.

source-file: docs/end-users/onboarding.md
source-file: app/lib/getStartedSteps.ts

### [0:40] Close
Take a moment to settle in. Your first guided step will begin shortly. You can replay this welcome or any training narration from the Get Started portal.

source-file: docs/end-users/onboarding.md

---

## Verification before publish

- [ ] Regenerated via `npm run docs:welcome-audio-script`
- [ ] Audio file at `public/docs/training/assets/get-started-welcome.mp3`
- [ ] Hard refresh `/get-started` on a fresh browser profile — welcome plays once before step audio

source-file: docs/end-users/onboarding.md
ref: GET /api/board/shared-context · emittedAt=2026-06-25T18:53:22.637Z
