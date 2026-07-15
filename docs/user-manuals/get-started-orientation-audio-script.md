# Get Started Orientation — Audio Script (Level 1)

**Author:** board-trainer (IronBoard User Trainer Agent)
**Generated:** 2026-07-15T13:20:00.000Z
**Synthesis:** llm
**Ingress:** docs/user-manuals/design-partner-operator-packet.md, docs/user-manuals/quickstart.md, docs/user-manuals/get-started-workspace-setup.md, docs/end-users/onboarding.md, app/lib/getStartedSteps.ts, lib/ironframeProductKnowledge/commercial.ts
**Companion doc:** [Design Partner Operator Packet](./design-partner-operator-packet.md) · [Command Post Orientation](./quickstart.md)

---

## Production notes

| Item | Value |
|------|--------|
| **Script path (this file)** | `docs/user-manuals/get-started-orientation-audio-script.md` |
| **Regenerate** | Deterministic backbone via Ironboard orientation generator · or edit this file |
| **Save your audio here** | `public/training-audio/get-started-orientation.mp3` |
| **Regenerate audio** | `npm run synthesize:get-started-audio` |
| **Env var (after export)** | `NEXT_PUBLIC_GET_STARTED_VIDEO_URL=/training-audio/get-started-orientation.mp3` |
| **Portal surface** | `/get-started` — Orientation walkthrough panel (audio player) |

**Tone:** Calm briefing. Short sentences. No sales language. Assume the listener is already signed in.

**Bucket B only:** Invite, password, MSA/DPA, and billing hold belong in Bucket A (email and `/register/{token}`). Do not narrate those steps here.

**Format tips:** Export mono or stereo MP3, 128 kbps or higher. Trim leading and trailing silence.

**Optional spoken glossary** (define on first use if recording extended take): **Command Post** — main dashboard; **Integrity Hub** — financial risk scores and baselines; **Evidence Locker** — WORM-sealed compliance documents; **ALE** — estimated annual loss from vulnerabilities; **WORM** — write-once storage that cannot be altered after seal; **Hazard Pipeline** — live risk tracking view; **Workforce Cockpit** — agent activity and safety sweeps; **Exports** — tenant-scoped CSV and PDF at `/exports`.

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

Welcome to the Ironframe Command Post. You are signed in to your assigned workspace. This walkthrough covers the Command Post layout and first tasks on the Get Started portal. You joined as a paid design partner on the Path B Command Tier seat at four thousand nine hundred ninety-nine dollars. Activation steps were handled separately. We focus on orientation only.

Pause two seconds.

source-file: docs/user-manuals/design-partner-operator-packet.md
source-file: docs/user-manuals/quickstart.md
source-file: app/lib/getStartedSteps.ts
source-file: lib/ironframeProductKnowledge/commercial.ts

### [0:28] Command Post layout

Use the top navigation bar: Dashboard, Integrity Hub, Evidence Locker, Exports, and Documentation. Your active workspace shows which tenant you are viewing. On the left, financial posture reflects your ALE baseline. On the right, the Hazard Pipeline tracks live risks. Press Tab to move between controls. Charts include text summaries for screen readers.

Pause two seconds.

source-file: docs/user-manuals/quickstart.md

### [1:05] Get Started checklist

The Get Started portal tracks five steps:

1. Workspace orientation with the Design Partner Operator Packet
2. Integrity Hub and ALE baselines
3. Partner training track
4. Trainer agent sandbox
5. Audit export path

Before you rely on Integrity Hub or exports, save your workspace ALE baseline and primary GRC company profile on this page.

Pause one second.

source-file: app/lib/getStartedSteps.ts
source-file: docs/user-manuals/get-started-workspace-setup.md

### [1:30] Primary control areas

Integrity Hub holds financial risk scores and protection baselines. Workforce Cockpit shows automated safety sweeps and agent activity. Evidence Locker stores sealed compliance documents. Exports provides tenant-scoped CSV and PDF downloads. Documentation holds Level 1 manuals and the curated partner training index. Settings holds contacts and tenant configuration. Links marked Pilot or Preview are not contracted deliverables.

Pause two seconds.

source-file: docs/user-manuals/quickstart.md
source-file: docs/user-manuals/pilot-vs-preview.md

### [2:05] Workspace orientation

The first checklist step opens the Design Partner Operator Packet. Review the Command Post layout, primary control areas, and the daily cockpit loop. Activation email steps are not repeated here.

Pause two seconds.

source-file: app/lib/getStartedSteps.ts
source-file: docs/user-manuals/design-partner-operator-packet.md

### [2:35] Integrity Hub and ALE baselines

Open Integrity Hub from the checklist or top navigation. Confirm your workspace ALE baseline and protection figures in US dollars. If Get Started still asks for an ALE value, save it on this portal first, then return to Integrity Hub.

Pause two seconds.

source-file: app/lib/getStartedSteps.ts
source-file: docs/user-manuals/get-started-workspace-setup.md

### [3:05] Partner training track

Open the curated partner training index from the checklist. It lists recommended Level 1 chapters for design partners and omits classroom seed labs. Work those chapters in order when you have time. Planned G A Ironframe Command is about thirty-five thousand dollars per year — always labeled planned until commercial G A is enabled.

Pause one second.

source-file: app/lib/getStartedSteps.ts
source-file: docs/training/LEVEL1-PARTNER-INDEX.md
source-file: lib/ironframeProductKnowledge/commercial.ts

### [3:35] Trainer agent sandbox

Use Ask Trainer from Header number one or the panel on Get Started. You can ask questions grounded on the verified training corpus in multi-turn sessions.

Pause two seconds.

source-file: app/lib/getStartedSteps.ts

### [3:55] Audit export path

Open Exports at slash exports from the checklist. Locate tenant-scoped CSV and PDF actions for auditor handoff. Do not use Pilot vendor screens for auditor files.

Pause two seconds.

source-file: app/lib/getStartedSteps.ts
source-file: docs/user-manuals/audit-exports.md

### [4:20] Close

Replay this audio while you complete the checklist. Progress saves in your browser. For the full partner handoff packet and Day zero through Day three checklist, open Documentation and follow the Design Partner Operator Packet.

source-file: docs/user-manuals/design-partner-operator-packet.md
source-file: docs/end-users/onboarding.md

---

## Verification before publish

- [ ] Script matches current `app/lib/getStartedSteps.ts` titles
- [ ] Script contains no Bucket A invite, password, MSA, or billing copy
- [ ] Says curated partner training index — not twenty-four-chapter classroom index
- [ ] Export path says `/exports` (spoken as “slash exports” or “Exports”)
- [ ] Mentions Path B Command Tier at four thousand nine hundred ninety-nine dollars
- [ ] Mentions planned G A Command about thirty-five thousand dollars per year
- [ ] Audio file at `public/training-audio/get-started-orientation.mp3`
- [ ] Step MP3s regenerated via `npm run synthesize:get-started-audio`
- [ ] Hard refresh `/get-started` — orientation and step audio play updated copy

source-file: docs/user-manuals/design-partner-operator-packet.md
ref: design-partner-docs-packet · emittedAt=2026-07-15T13:20:00.000Z
