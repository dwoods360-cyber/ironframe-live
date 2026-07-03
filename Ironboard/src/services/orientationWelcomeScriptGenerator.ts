import fs from "node:fs";
import path from "node:path";

import { GoogleGenAI } from "@google/genai";

import { DETERMINISTIC_GENERATION_PARAMS } from "../config/deterministicModel.js";
import { buildGroundedSystemPrompt } from "../prompts.js";
import { getIronboardApiKey, getIronboardGeminiModel, loadIronboardEnv } from "../loadIronboardEnv.js";
import { withGeminiRateLimitRetry } from "../lib/geminiRetry.js";
import { validateOutboundContent } from "../validation/contentFirewall.js";
import type { IronframeDocumentationBrief } from "../types/ironframeDocumentationBrief.js";
import type { OrientationCorpusSources } from "./orientationAudioScriptGenerator.js";

loadIronboardEnv();

const OUTPUT_RELATIVE = "docs/user-manuals/get-started-welcome-audio-script.md";
const MAX_OUTPUT_TOKENS = 2_048;

/** Platform-wide welcome — one script/audio for all tenants and operators (no per-company TTS). */
export type WelcomeScriptContext = Record<string, never>;

function resolveRepoRoot(): string {
  const candidates = [process.cwd(), path.join(process.cwd(), "..")];
  for (const root of candidates) {
    if (fs.existsSync(path.join(root, "docs", "user-manuals", "quickstart.md"))) {
      return root;
    }
  }
  return process.cwd();
}

/** Trainer-owned skeleton — warm Ironframe greeting before checklist training audio. */
export function buildTrainerWelcomeSkeleton(_context: WelcomeScriptContext = {}): string {
  return [
    "### [0:00] Welcome",
    "",
    "Welcome to Ironframe. You have successfully activated your isolated tenant workspace. Your perimeter is live and you are signed in as the workspace operator.",
    "",
    "Pause two seconds.",
    "",
    "### [0:20] What happens next",
    "",
    "This brief welcome plays once before your guided training. You will hear step-by-step narration for the Get Started checklist: Command Post orientation, Integrity Hub baselines, Level 1 curriculum, Trainer sandbox, and audit exports.",
    "",
    "Pause one second.",
    "",
    "### [0:40] Close",
    "",
    "Take a moment to settle in. When this message ends, your first guided step will begin. You may replay any narration from the Get Started portal at your own pace.",
    "",
    "source-file: docs/end-users/onboarding.md",
    "source-file: app/lib/getStartedSteps.ts",
  ].join("\n");
}

function buildWriterUserPrompt(
  brief: IronframeDocumentationBrief,
  sources: OrientationCorpusSources,
  trainerSkeleton: string,
): string {
  return `=== IRONFRAME DOCUMENTATION BRIEF ===
Release: ${brief.release}
Mandate: ${brief.mandate}

=== COLLABORATION MODEL ===
board-trainer supplied the pedagogical skeleton below.
You are board-writer — professionalize it into spoken welcome audio (45–75 seconds at calm pace).

=== PLATFORM SCOPE (MANDATORY) ===
This is ONE shared welcome for every tenant and operator on Ironframe.
Do NOT mention company names, tenant slugs, or operator email addresses.
Personalization belongs in the on-screen UI only — not in spoken audio.

=== BUCKET B CONSTRAINT (MANDATORY) ===
Post-authentication only. FORBIDDEN:
- Invite email, password setup, MSA/DPA checkboxes, billing hold, legal portals
- Cold procedural tone — this is the operator's first moment inside the Command Post

=== CORPUS EXCERPT: ONBOARDING ===
${sources.onboardingMarkdown.slice(0, 2_500)}

=== TRAINER SKELETON (preserve section timestamps, improve warmth) ===
${trainerSkeleton}

AUTHORING REQUIREMENTS:
1. Output ONLY the "## Script" body: timestamped sections, spoken paragraphs, "Pause N seconds." lines.
2. Open with a genuine Ironframe welcome — acknowledge successful workspace activation (generic).
3. Do NOT name any customer, company, or tenant slug.
4. Close by handing off to guided training narration.
5. Short sentences. No emojis or exclamation points.
6. Include source-file lines after major sections.
7. Do NOT include production notes or CapCut instructions.

Write the welcome script now:`;
}

function normalizeWelcomeScriptBody(body: string): string {
  return body.replace(/^##\s*Script\s*\n+/i, "").trim();
}

export async function generateWelcomeAudioScriptBody(
  brief: IronframeDocumentationBrief,
  sources: OrientationCorpusSources,
  _context: WelcomeScriptContext = {},
): Promise<string> {
  const trainerSkeleton = buildTrainerWelcomeSkeleton();
  const apiKey = getIronboardApiKey();

  if (!apiKey) {
    console.warn(
      "[OrientationWelcomeScriptGenerator] GEMINI_API_KEY missing — using Trainer skeleton only.",
    );
    return trainerSkeleton;
  }

  const systemInstruction = buildGroundedSystemPrompt("WRITER");

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await withGeminiRateLimitRetry(
      () =>
        ai.models.generateContent({
          model: getIronboardGeminiModel(),
          contents: buildWriterUserPrompt(brief, sources, trainerSkeleton),
          config: {
            systemInstruction,
            temperature: DETERMINISTIC_GENERATION_PARAMS.temperature,
            topP: DETERMINISTIC_GENERATION_PARAMS.topP,
            maxOutputTokens: MAX_OUTPUT_TOKENS,
          },
        }),
      { label: "orientation-welcome-script-generator" },
    );

    const synthesized = response.text?.trim();
    if (!synthesized || synthesized.length < 200) {
      return trainerSkeleton;
    }

    const cleaned = normalizeWelcomeScriptBody(synthesized);
    const withAnchors = cleaned.includes("source-file:")
      ? cleaned
      : `${cleaned}\n\nsource-file: docs/end-users/onboarding.md\nsource-file: app/lib/getStartedSteps.ts`;

    const validation = validateOutboundContent(withAnchors, {
      agentRole: "WRITER",
      requireSourceReferences: true,
    });
    if (!validation.ok) {
      console.warn(
        `[OrientationWelcomeScriptGenerator] Content firewall: ${validation.violations.join(" | ")} — using Trainer skeleton.`,
      );
      return trainerSkeleton;
    }

    return withAnchors;
  } catch (error) {
    console.warn(
      "[OrientationWelcomeScriptGenerator] LLM synthesis failed:",
      error instanceof Error ? error.message : error,
    );
    return trainerSkeleton;
  }
}

export function buildWelcomeAudioScriptDocument(
  scriptBody: string,
  brief: IronframeDocumentationBrief,
  options?: { generatedAt?: string; synthesisMode?: "llm" | "deterministic" },
): string {
  const generatedAt = options?.generatedAt ?? new Date().toISOString();
  const mode = options?.synthesisMode ?? "llm";

  return `# Get Started Welcome — Audio Script (Level 1)

**Author:** board-writer (Narrative Architect), blueprint by board-trainer
**Generated:** ${generatedAt}
**Synthesis:** ${mode}
**Ingress:** docs/end-users/onboarding.md, app/lib/getStartedSteps.ts
**Plays:** Once on first visit to \`/get-started\`, before guided step narration

---

## Production notes

| Item | Value |
|------|--------|
| **Script path (this file)** | \`${OUTPUT_RELATIVE}\` |
| **Regenerate** | \`npm run docs:welcome-audio-script\` |
| **Save your audio here** | \`public/docs/training/assets/get-started-welcome.mp3\` |
| **Env var (optional override)** | \`NEXT_PUBLIC_GET_STARTED_WELCOME_AUDIO_URL=/docs/training/assets/get-started-welcome.mp3\` |
| **Portal surface** | \`/get-started\` — welcome audio plays before step narration |

**Tone:** Warm, brief, operator-facing. One shared Ironframe welcome for all tenants — no company names in audio.

**Platform scope:** Personalize in UI only (workspace banner, tenant slug). Do not record per-customer welcome audio.

**Bucket B only:** No invite, password, or legal checkbox copy.

---

## Script

${scriptBody.trim()}

---

## Verification before publish

- [ ] Regenerated via \`npm run docs:welcome-audio-script\`
- [ ] Audio file at \`public/docs/training/assets/get-started-welcome.mp3\`
- [ ] Hard refresh \`/get-started\` on a fresh browser profile — welcome plays once before step audio

source-file: docs/end-users/onboarding.md
ref: GET /api/board/shared-context · emittedAt=${brief.emittedAt}
`;
}

export const WELCOME_AUDIO_SCRIPT_OUTPUT = OUTPUT_RELATIVE;
