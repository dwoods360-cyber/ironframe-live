import fs from "node:fs";
import path from "node:path";

import { GoogleGenAI } from "@google/genai";

import { DETERMINISTIC_GENERATION_PARAMS } from "../config/deterministicModel.js";
import { buildGroundedSystemPrompt } from "../prompts.js";
import { getIronboardApiKey, getIronboardGeminiModel, loadIronboardEnv } from "../loadIronboardEnv.js";
import { withGeminiRateLimitRetry } from "../lib/geminiRetry.js";
import { validateOutboundContent } from "../validation/contentFirewall.js";
import type { IronframeDocumentationBrief } from "../types/ironframeDocumentationBrief.js";

loadIronboardEnv();

const OUTPUT_RELATIVE = "docs/user-manuals/get-started-orientation-audio-script.md";
const MAX_OUTPUT_TOKENS = 4_096;

export type OrientationCorpusSources = {
  quickstartMarkdown: string;
  onboardingMarkdown: string;
  getStartedStepsJson: string;
  partnerPacketMarkdown: string;
};

function resolveRepoRoot(): string {
  const candidates = [process.cwd(), path.join(process.cwd(), "..")];
  for (const root of candidates) {
    if (fs.existsSync(path.join(root, "docs", "user-manuals", "quickstart.md"))) {
      return root;
    }
  }
  return process.cwd();
}

function readRepoFile(relativePath: string): string {
  const absolute = path.join(resolveRepoRoot(), relativePath);
  if (!fs.existsSync(absolute)) {
    throw new Error(`Missing corpus source: ${relativePath}`);
  }
  return fs.readFileSync(absolute, "utf8").trim();
}

export function loadOrientationCorpusSources(): OrientationCorpusSources {
  return {
    quickstartMarkdown: readRepoFile("docs/user-manuals/quickstart.md"),
    onboardingMarkdown: readRepoFile("docs/end-users/onboarding.md"),
    getStartedStepsJson: readRepoFile("app/lib/getStartedSteps.ts"),
    partnerPacketMarkdown: readRepoFile(
      "docs/user-manuals/design-partner-operator-packet.md",
    ),
  };
}

function buildChecklistSummary(getStartedStepsSource: string): string {
  const matches = [
    ...getStartedStepsSource.matchAll(/title:\s*"([^"]+)"[\s\S]*?description:\s*"([^"]+)"/g),
  ];
  if (matches.length === 0) {
    return "- Workspace orientation\n- Integrity Hub\n- Partner training\n- Trainer sandbox\n- Audit exports";
  }
  return matches
    .map((match, index) => `${index + 1}. ${match[1]} — ${match[2]}`)
    .join("\n");
}

/** Deterministic backbone — used when LLM unavailable and as structural guardrails. */
export function buildDeterministicOrientationScript(
  brief: IronframeDocumentationBrief,
  sources: OrientationCorpusSources,
): string {
  const checklist = buildChecklistSummary(sources.getStartedStepsJson);

  return [
    "### [0:00] Open",
    "",
    "Welcome to the Ironframe Command Post. You are signed in to your assigned workspace. This walkthrough covers layout and first tasks on the Get Started portal. Activation steps were handled separately. We focus on orientation only.",
    "",
    "Pause two seconds.",
    "",
    "---",
    "",
    "### [0:20] Command Post layout",
    "",
    "Use the top navigation bar: Dashboard, Integrity Hub, Evidence Locker, Exports, and Documentation. Your active workspace shows which tenant you are viewing. Financial posture reflects your ALE baseline. The Hazard Pipeline tracks live risks. Press Tab to move between controls. Charts include text summaries for screen readers.",
    "",
    "Pause two seconds.",
    "",
    "---",
    "",
    "### [0:55] Get Started checklist",
    "",
    "The Get Started portal tracks five steps:",
    "",
    checklist,
    "",
    "Before you rely on Integrity Hub or exports, save your workspace ALE baseline and primary GRC company profile on this page.",
    "",
    "Pause one second.",
    "",
    "---",
    "",
    "### [1:20] Primary control areas",
    "",
    "Integrity Hub holds financial risk scores and protection baselines. Workforce Cockpit shows automated safety sweeps and agent trails. Evidence Locker stores sealed compliance documents. Exports provides tenant-scoped CSV and PDF downloads. Documentation holds Level 1 manuals and the curated partner training index. Settings holds contacts and tenant configuration.",
    "",
    "Pause two seconds.",
    "",
    "---",
    "",
    "### [1:55] Workspace orientation",
    "",
    "The first checklist step opens the Design Partner Operator Packet. Review the Command Post layout, primary control areas, and the daily cockpit loop. Activation steps are not repeated here.",
    "",
    "Pause two seconds.",
    "",
    "---",
    "",
    "### [2:25] Integrity Hub and ALE baselines",
    "",
    "Open Integrity Hub from the checklist or top navigation. Confirm your workspace ALE baseline and protection figures in USD.",
    "",
    "Pause two seconds.",
    "",
    "---",
    "",
    "### [2:50] Partner training track",
    "",
    "Open the curated partner training index from the checklist. It lists recommended Level 1 chapters for design partners and omits classroom seed labs. Work those chapters in order when you have time.",
    "",
    "Pause one second.",
    "",
    "---",
    "",
    "### [3:10] Trainer agent sandbox",
    "",
    "Use Ask Trainer from Header number one or the panel on Get Started. Ask questions grounded on the verified training corpus in multi-turn sessions.",
    "",
    "Pause two seconds.",
    "",
    "---",
    "",
    "### [3:30] Audit export path",
    "",
    "Open Exports at slash exports from the checklist. Locate tenant-scoped CSV and PDF actions for auditor handoff.",
    "",
    "Pause two seconds.",
    "",
    "---",
    "",
    "### [3:55] Close",
    "",
    "Replay this audio while you complete the checklist. Progress saves in your browser. For the full partner handoff packet, open Documentation and follow the Design Partner Operator Packet.",
    "",
    `ref: GET /api/board/shared-context · emittedAt=${brief.emittedAt}`,
    "source-file: docs/user-manuals/design-partner-operator-packet.md",
    "source-file: docs/user-manuals/quickstart.md",
    "source-file: docs/end-users/onboarding.md",
    "source-file: app/lib/getStartedSteps.ts",
  ].join("\n");
}

function buildOrientationUserPrompt(
  brief: IronframeDocumentationBrief,
  sources: OrientationCorpusSources,
  deterministicDraft: string,
): string {
  return `=== IRONFRAME DOCUMENTATION BRIEF ===
Release: ${brief.release}
Posture: ${brief.posture}
Mandate: ${brief.mandate}
Tenant scope: ${brief.platformFacts.tenantId}

=== BUCKET B CONSTRAINT (MANDATORY) ===
This is post-authentication operator audio only (Bucket B). FORBIDDEN in spoken script:
- Invite email inbox instructions, Initialize Workspace email CTA, password setup walkthrough
- MSA/DPA acceptance steps, billing hold, legal sign-off portals
- ASCII wireframes, markdown tables, or UI labels not in source corpus

=== CORPUS: QUICKSTART (LEVEL 1) ===
${sources.quickstartMarkdown}

=== CORPUS: DESIGN PARTNER OPERATOR PACKET ===
${sources.partnerPacketMarkdown.slice(0, 4_000)}

=== CORPUS: ONBOARDING (DAY 1 EXCERPT) ===
${sources.onboardingMarkdown.slice(0, 4_000)}

=== CORPUS: GET STARTED STEPS (app/lib/getStartedSteps.ts) ===
${sources.getStartedStepsJson}

=== STRUCTURAL BACKBONE (professionalize — preserve section timestamps) ===
${deterministicDraft}

AUTHORING REQUIREMENTS:
1. Output ONLY the "## Script" body: timestamped sections (### [m:ss] Title), spoken paragraphs, and "Pause N seconds." lines.
2. Target 3:30–4:30 at calm pace. Short sentences. No emojis or exclamation points.
3. Include separate spoken sections for EACH of the five Get Started checklist steps (workspace orientation / operator packet, Integrity Hub, partner training index, Trainer sandbox, audit exports) — not only a numbered list.
4. Ground every UI surface name in the corpus — do not invent routes or features.
5. After each major section, include source-file lines citing the corpus file used.
6. Do NOT include production notes, CapCut instructions, or markdown document title.
7. Do NOT read checklist step descriptions verbatim — professionalize for spoken audio while preserving meaning.
8. Partner training uses the curated LEVEL1-PARTNER-INDEX — say curated partner training chapters; never say twenty-four-chapter classroom student index; never say twelve chapters.
9. Trainer sandbox supports multi-turn sessions via Header #1 Ask Trainer and the Get Started panel — never say one question only.
10. Export path is /exports (spoken as Exports or slash exports) — never say Dashboard Exports.
11. Do not mention cryptographic key paths in Settings — tenant configuration and contacts only.
12. Bucket B only — no invite inbox, password, MSA/DPA, or billing checkout narration.

Write the complete spoken script now:`;
}

export async function generateOrientationAudioScriptBody(
  brief: IronframeDocumentationBrief,
  sources: OrientationCorpusSources = loadOrientationCorpusSources(),
): Promise<string> {
  const deterministicDraft = buildDeterministicOrientationScript(brief, sources);
  const apiKey = getIronboardApiKey();

  if (!apiKey) {
    console.warn(
      "[OrientationAudioScriptGenerator] GEMINI_API_KEY missing — using deterministic Trainer backbone.",
    );
    return deterministicDraft;
  }

  const systemInstruction = buildGroundedSystemPrompt("TRAINER");

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await withGeminiRateLimitRetry(
      () =>
        ai.models.generateContent({
          model: getIronboardGeminiModel(),
          contents: buildOrientationUserPrompt(brief, sources, deterministicDraft),
          config: {
            systemInstruction,
            temperature: DETERMINISTIC_GENERATION_PARAMS.temperature,
            topP: DETERMINISTIC_GENERATION_PARAMS.topP,
            maxOutputTokens: MAX_OUTPUT_TOKENS,
          },
        }),
      { label: "orientation-audio-script-generator" },
    );

    const synthesized = response.text?.trim();
    if (!synthesized || synthesized.length < 400) {
      return deterministicDraft;
    }

    const withAnchors = synthesized.includes("source-file:")
      ? synthesized
      : `${synthesized}\n\nsource-file: docs/user-manuals/quickstart.md\nsource-file: app/lib/getStartedSteps.ts\nref: GET /api/board/shared-context · emittedAt=${brief.emittedAt}`;

    const validation = validateOutboundContent(withAnchors, {
      agentRole: "TRAINER",
      requireSourceReferences: true,
    });
    if (!validation.ok) {
      console.warn(
        `[OrientationAudioScriptGenerator] Content firewall: ${validation.violations.join(" | ")} — using backbone.`,
      );
      return deterministicDraft;
    }

    return withAnchors;
  } catch (error) {
    console.warn(
      "[OrientationAudioScriptGenerator] LLM synthesis failed:",
      error instanceof Error ? error.message : error,
    );
    return deterministicDraft;
  }
}

export function buildOrientationAudioScriptDocument(
  scriptBody: string,
  brief: IronframeDocumentationBrief,
  options?: { generatedAt?: string; synthesisMode?: "llm" | "deterministic" },
): string {
  const generatedAt = options?.generatedAt ?? new Date().toISOString();
  const mode = options?.synthesisMode ?? "llm";

  return `# Get Started Orientation — Audio Script (Level 1)

**Author:** board-trainer (IronBoard User Trainer Agent)
**Generated:** ${generatedAt}
**Synthesis:** ${mode}
**Ingress:** docs/user-manuals/quickstart.md, docs/end-users/onboarding.md, app/lib/getStartedSteps.ts
**Companion doc:** [Command Post Orientation](./quickstart.md)

---

## Production notes

| Item | Value |
|------|--------|
| **Script path (this file)** | \`${OUTPUT_RELATIVE}\` |
| **Regenerate** | \`npm run docs:orientation-audio-script\` |
| **Save your audio here** | \`public/training-audio/get-started-orientation.mp3\` |
| **Env var (after export)** | \`NEXT_PUBLIC_GET_STARTED_VIDEO_URL=/training-audio/get-started-orientation.mp3\` |
| **Portal surface** | \`/get-started\` — Orientation walkthrough panel (audio player) |

**Tone:** Calm briefing. Short sentences. No sales language. Assume the listener is already signed in.

**Bucket B only:** Invite, password, MSA/DPA, and billing hold belong in Bucket A (email and \`/register/{token}\`).

**Format tips:** Export mono or stereo MP3, 128 kbps or higher. Trim leading and trailing silence.

**Optional spoken glossary** (define on first use if recording extended take): **Command Post** — main dashboard; **Integrity Hub** — financial risk scores and baselines; **Evidence Locker** — WORM-sealed compliance documents; **ALE** — estimated annual loss from vulnerabilities; **WORM** — write-once storage that cannot be altered after seal; **Hazard Pipeline** — live risk tracking view; **Workforce Cockpit** — agent activity and safety sweeps.

---

## CapCut workflow

Use **CapCut Desktop** (recommended) or mobile.

### Text-to-speech

1. **New project** → blank timeline.
2. Copy **spoken paragraphs only** from \`## Script\` below (one section at a time) into **Text → Text-to-speech**.
3. Voice: calm, neutral English.
4. At each **Pause one/two seconds** line, add 1–2 s silence on the timeline — do not paste pause text into TTS.
5. Export MP3, or MP4 then \`ffmpeg -i export.mp4 -vn -acodec libmp3lame -q:a 2 get-started-orientation.mp3\`
6. Save to \`public/training-audio/get-started-orientation.mp3\`

---

## Script

${scriptBody.trim()}

---

## Verification before publish

- [ ] Regenerated via \`npm run docs:orientation-audio-script\` after quickstart or checklist changes
- [ ] Script contains no Bucket A invite or legal sign-off copy
- [ ] Audio file at \`public/training-audio/get-started-orientation.mp3\`
- [ ] \`.env.local\` sets \`NEXT_PUBLIC_GET_STARTED_VIDEO_URL=/training-audio/get-started-orientation.mp3\`
- [ ] Hard refresh \`/get-started\` — audio control appears

source-file: docs/user-manuals/quickstart.md
ref: GET /api/board/shared-context · emittedAt=${brief.emittedAt}
`;
}

export const ORIENTATION_AUDIO_SCRIPT_OUTPUT = OUTPUT_RELATIVE;
