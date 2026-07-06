# Get Started Orientation — Audio Script (Level 1)

**Author:** board-trainer (IronBoard User Trainer Agent)
**Generated:** 2026-06-22T18:01:25.926Z
**Synthesis:** llm
**Ingress:** docs/user-manuals/quickstart.md, docs/end-users/onboarding.md, app/lib/getStartedSteps.ts
**Companion doc:** [Command Post Orientation](./quickstart.md)

---

## Production notes

| Item | Value |
|------|--------|
| **Script path (this file)** | `docs/user-manuals/get-started-orientation-audio-script.md` |
| **Regenerate** | `npm run docs:orientation-audio-script` |
| **Save your audio here** | `public/training-audio/get-started-orientation.mp3` |
| **Regenerate audio** | `npm run synthesize:get-started-audio` |
| **Env var (after export)** | `NEXT_PUBLIC_GET_STARTED_VIDEO_URL=/training-audio/get-started-orientation.mp3` |
| **Portal surface** | `/get-started` — Orientation walkthrough panel (audio player) |

**Tone:** Calm briefing. Short sentences. No sales language. Assume the listener is already signed in.

**Bucket B only:** Invite, password, MSA/DPA, and billing hold belong in Bucket A (email and `/register/{token}`).

**Format tips:** Export mono or stereo MP3, 128 kbps or higher. Trim leading and trailing silence.

**Optional spoken glossary** (define on first use if recording extended take): **Command Post** — main dashboard; **Integrity Hub** — financial risk scores and baselines; **Evidence Locker** — WORM-sealed compliance documents; **ALE** — estimated annual loss from vulnerabilities; **WORM** — write-once storage that cannot be altered after seal; **Hazard Pipeline** — live risk tracking view; **Workforce Cockpit** — agent activity and safety sweeps.

---

## CapCut workflow

Use **CapCut Desktop** (recommended) or mobile.

### Text-to-speech

1. **New project** → blank timeline.
2. Copy **spoken paragraphs only** from `## Script` below (one section at a time) into **Text → Text-to-speech**.
3. Voice: calm, neutral English.
4. At each **Pause one/two seconds** line, add 1–2 s silence on the timeline — do not paste pause text into TTS.
5. Export MP3, or MP4 then `ffmpeg -i export.mp4 -vn -acodec libmp3lame -q:a 2 get-started-orientation.mp3`
6. Save to `public/training-audio/get-started-orientation.mp3` (or run `npm run synthesize:get-started-audio`)

---

## Script

### [0:00] Open

Welcome to the Ironframe Command Post. You are signed in to your assigned workspace. This walkthrough covers the Command Post layout and first tasks on the Get Started portal. Invite and credential steps were handled during activation. We focus on orientation only.

Pause two seconds.

source-file: docs/user-manuals/quickstart.md
source-file: app/lib/getStartedSteps.ts

### [0:20] Command Post layout

Use the top navigation bar: Dashboard Cockpit, Integrity Hub, Evidence Locker, and Documentation. Your active tenant window shows which workspace you are viewing. On the left, Financial Targets show your safe baselines. On the right, the Hazard Pipeline tracks real-time risks. Press Tab to move between controls. Charts include text summaries for screen readers.

Pause two seconds.

source-file: docs/user-manuals/quickstart.md

### [0:55] Get Started checklist

The Get Started portal tracks five steps:

1.  Command Post orientation
2.  Integrity Hub and ALE baselines
3.  Level 1 training track
4.  Trainer agent sandbox
5.  Audit export path

Pause one second.

source-file: app/lib/getStartedSteps.ts

### [1:15] Primary control areas

Integrity Hub holds financial risk scores and protection baselines. Workforce Cockpit shows automated safety sweeps and agent activity trails. Evidence Locker stores sealed compliance documents. Documentation holds Level 1 manuals and training tracks. Settings holds tenant configuration and contacts.

Pause two seconds.

source-file: docs/user-manuals/quickstart.md

### [1:50] Command Post orientation

The first step is Command Post orientation. Review the Command Post layout, primary control areas, and keyboard navigation. Invite steps are handled separately in your activation email.

Pause two seconds.

source-file: app/lib/getStartedSteps.ts
source-file: docs/user-manuals/quickstart.md

### [2:20] Integrity Hub and ALE baselines

Open Integrity Hub from the checklist or top navigation. Confirm your tenant name and baseline figures. These figures are displayed in US dollars.

Pause two seconds.

source-file: app/lib/getStartedSteps.ts
source-file: docs/user-manuals/quickstart.md

### [2:40] Level 1 training track

Open the twenty-four-chapter Level 1 student index from the checklist. This curriculum includes labs tailored for your role. Work chapters in order when you have time.

Pause one second.

source-file: app/lib/getStartedSteps.ts

### [3:00] Trainer agent sandbox

Use Ask Trainer from Header number one or the panel on Get Started. You can ask questions grounded on the verified Level 1 corpus in multi-turn sessions.

Pause two seconds.

source-file: app/lib/getStartedSteps.ts

### [3:20] Audit export path

Open Dashboard Exports from the checklist. Locate tenant-scoped CSV and PDF export actions for auditor handoff.

Pause two seconds.

source-file: app/lib/getStartedSteps.ts
source-file: docs/end-users/onboarding.md

### [3:45] Close

Replay this audio while you complete the checklist. Progress saves in your browser. For deeper first-week tasks, open the extended onboarding checklist in Documentation.

source-file: docs/end-users/onboarding.md

---

## Verification before publish

- [ ] Regenerated via `npm run docs:orientation-audio-script` after quickstart or checklist changes
- [ ] Script contains no Bucket A invite or legal sign-off copy
- [ ] Audio file at `public/training-audio/get-started-orientation.mp3`
- [ ] `.env.local` sets `NEXT_PUBLIC_GET_STARTED_VIDEO_URL=/training-audio/get-started-orientation.mp3`
- [ ] Hard refresh `/get-started` — audio control appears

source-file: docs/user-manuals/quickstart.md
ref: GET /api/board/shared-context · emittedAt=2026-06-22T18:01:25.926Z
