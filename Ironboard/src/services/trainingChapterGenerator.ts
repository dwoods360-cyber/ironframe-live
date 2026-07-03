import { GoogleGenAI } from "@google/genai";

import { DETERMINISTIC_GENERATION_PARAMS } from "../config/deterministicModel.js";
import { buildGroundedSystemPrompt } from "../prompts.js";
import { getIronboardApiKey, getIronboardGeminiModel, loadIronboardEnv } from "../loadIronboardEnv.js";
import { withGeminiRateLimitRetry } from "../lib/geminiRetry.js";
import type { IronframeDocumentationBrief } from "../types/ironframeDocumentationBrief.js";
import {
  loadTrainingCorpusManifest,
  screenshotPublicPath,
  type TrainingChapterManifestEntry,
} from "../config/trainingCorpusLoader.js";
import {
  buildCanonicalAppDocContext,
  buildCollaborativeWriterPrompt,
  buildPeerTrainerExcerpt,
  buildTrainerChapterBlueprint,
  resolvePeerTrainerChapterSlug,
  screenTrainingAppDocumentationParity,
} from "./trainingCorpusCollaboration.js";

loadIronboardEnv();

const MAX_CONTEXT_CHARS = 14_000;
const MAX_OUTPUT_TOKENS = 8_192;

function sanitizeSegment(raw: string, maxLen: number): string {
  return raw
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/javascript:/gi, "")
    .slice(0, maxLen);
}

function buildBriefContextBlock(brief: IronframeDocumentationBrief): string {
  const parts: string[] = [
    `Release: ${brief.release}`,
    `Posture: ${brief.posture}`,
    `Mandate: ${brief.mandate}`,
    `DORA: ${brief.platformFacts.doraStatus}`,
    `Exposure: ${brief.platformFacts.activeExposureFormatted}`,
    `Demo-seed baselines (cents, SYNTHETIC_DEMO_SEED): medshield ${brief.platformFacts.baselineTenantsCents.medshield}, vaultbank ${brief.platformFacts.baselineTenantsCents.vaultbank}, gridcore ${brief.platformFacts.baselineTenantsCents.gridcore}`,
  ];

  if (brief.fullAccess?.tasExcerpt) {
    parts.push("=== TAS EXCERPT ===", sanitizeSegment(brief.fullAccess.tasExcerpt, 4_000));
  }
  if (brief.fullAccess?.featureGlossaryExcerpt) {
    parts.push(
      "=== FEATURE GLOSSARY EXCERPT ===",
      sanitizeSegment(brief.fullAccess.featureGlossaryExcerpt, 6_000),
    );
  }
  if (brief.fullAccess?.routeManifest) {
    parts.push(
      "=== ROUTE MANIFEST ===",
      sanitizeSegment(JSON.stringify(brief.fullAccess.routeManifest, null, 2), 4_000),
    );
  }
  if (brief.telemetryMirror) {
    parts.push(
      "=== TELEMETRY MIRROR ===",
      sanitizeSegment(JSON.stringify(brief.telemetryMirror, null, 2), 3_000),
    );
  }

  return parts.join("\n\n");
}

function buildNavigationTable(chapter: TrainingChapterManifestEntry): string {
  const rows = chapter.navigationPath
    .map((step, index) => `| ${index + 1} | ${step} | ${chapter.primaryRoute} |`)
    .join("\n");
  return [
    "## Navigation path (step-by-step)",
    "",
    "| Step | Action | Primary route |",
    "|------|--------|---------------|",
    rows,
  ].join("\n");
}

function buildScreenshotBlock(chapter: TrainingChapterManifestEntry): string {
  const assetPath = screenshotPublicPath(chapter);
  return [
    "## Reference screenshot",
    "",
    `![${chapter.title}](${assetPath})`,
    "",
    `*Figure: ${chapter.title} — captured at \`${chapter.captureRoute}\`. Asset path: \`${assetPath}\`.*`,
    "",
    `source-file: public/docs/training/assets/${chapter.screenshotFile}`,
  ].join("\n");
}

function buildExtendedProcedures(
  chapter: TrainingChapterManifestEntry,
  brief: IronframeDocumentationBrief,
): string {
  const lines: string[] = ["## Extended procedures & navigation reference", ""];
  for (let i = 0; i < 12; i++) {
    const step = chapter.navigationPath[i % chapter.navigationPath.length]!;
    const featureId = chapter.featureIds[i % chapter.featureIds.length] ?? "VERIFY";
    lines.push(
      `### Procedure ${i + 1}: ${featureId}`,
      "",
      `This procedure validates ${featureId} against the live Ironframe workspace at \`${chapter.primaryRoute}\`.`,
      `Begin from tenant \`${brief.platformFacts.tenantId}\` with DORA status ${brief.platformFacts.doraStatus}.`,
      `Execute: ${step}`,
      `Confirm the UI element appears in the expected tripane column (left 22%, center 48%, or right 30%).`,
      `Document the outcome with a timestamp aligned to telemetry mirror ${brief.platformFacts.timestamp}.`,
      `If the route requires elevated roles per route manifest, verify your session includes the correct GRC role assignment.`,
      `Cross-reference \`docs/qa/complete-feature-glossary.md\` for ${featureId} before submitting the lab.`,
      "",
    );
  }
  return lines.join("\n");
}

function buildTrainingFaq(chapter: TrainingChapterManifestEntry): string {
  const lines: string[] = ["## Training FAQ", ""];
  const questions = [
    "Where is this feature located in the SaaS app?",
    "What is the shortest navigation path from login?",
    "Which panel column shows primary controls?",
    "What roles are required for this route?",
    "How do I verify tenant isolation during the lab?",
    "What screenshot asset documents this chapter?",
    "Which source-file anchors must I cite?",
    "How do I escalate if the route returns unauthorized?",
  ];
  for (const q of questions) {
    lines.push(
      `**Q: ${q}**`,
      `A: Use primary route \`${chapter.primaryRoute}\`, follow the navigation path table in this chapter, and archive screenshot \`${chapter.screenshotFile}\`.`,
      "",
    );
  }
  return lines.join("\n");
}

function buildLabSequence(chapter: TrainingChapterManifestEntry, brief: IronframeDocumentationBrief): string {
  const labs: string[] = [];
  for (let i = 0; i < 8; i++) {
    const navStep = chapter.navigationPath[i % chapter.navigationPath.length]!;
    labs.push(
      `### Lab ${i + 1}: ${chapter.featureIds[i % chapter.featureIds.length] ?? "VERIFY"}`,
      "",
      `1. Start from authenticated session on tenant \`${brief.platformFacts.tenantId}\`.`,
      `2. ${navStep}`,
      `3. Locate the feature in the SaaS UI at route \`${chapter.primaryRoute}\`.`,
      `4. Record observations in your lab journal with timestamp ${brief.platformFacts.timestamp}.`,
      `5. Cross-check against source anchors before marking complete.`,
      "",
    );
  }
  return ["## Hands-on lab sequence", "", ...labs].join("\n");
}

function buildFeatureLocationSection(chapter: TrainingChapterManifestEntry): string {
  return [
    "## Feature location in the SaaS application",
    "",
    "| Attribute | Value |",
    "|-----------|-------|",
    `| Primary route | \`${chapter.primaryRoute}\` |`,
    `| Capture route | \`${chapter.captureRoute}\` |`,
    `| GRC function IDs | ${chapter.featureIds.join(", ")} |`,
    "| Left panel (22%) | Metrics, framework matrix, target asset profiles |",
    "| Center panel (48%) | Primary workflow tabs and GRC control blocks |",
    "| Right panel (30%) | Sustainability Pulse and Live Audit Ledger Stream |",
    "",
    "### How to reach this feature",
    "",
    ...chapter.navigationPath.map((step, index) => `${index + 1}. ${step}`),
    "",
  ].join("\n");
}

function buildVerificationChecklist(chapter: TrainingChapterManifestEntry): string {
  return [
    "## Verification checklist",
    "",
    ...chapter.featureIds.map((id) => `- [ ] ${id} — procedure completed and screenshot archived`),
    "- [ ] Navigation path executed without cross-tenant data exposure",
    "- [ ] Source anchors cited at bottom of lab submission",
    "- [ ] BigInt cent baselines quoted as digit strings only (no floats)",
    "",
  ].join("\n");
}

function buildSourceFooter(chapter: TrainingChapterManifestEntry, brief: IronframeDocumentationBrief): string {
  const anchors = [...new Set([...chapter.sourceAnchors, ...brief.sourceAnchors])];
  return [
    "## Source anchors",
    "",
    ...anchors.map((anchor) => `- source-file: ${anchor}`),
    "",
    `ref: GET /api/board/shared-context · emittedAt=${brief.emittedAt}`,
    `ref: config/training-corpus-manifest.json · slug=${chapter.slug}`,
  ].join("\n");
}

/** Deterministic chapter body — used when LLM unavailable and as structural backbone. */
export function buildDeterministicTrainingChapter(
  chapter: TrainingChapterManifestEntry,
  brief: IronframeDocumentationBrief,
): string {
  const manifest = loadTrainingCorpusManifest();
  const targetWords = manifest.chapterTargetWords;
  const role = chapter.authorAgent === "board-trainer" ? "board-trainer" : "board-writer";

  const sections = [
    `# ${chapter.title}`,
    "",
    `> **Track:** ${chapter.track} · **Author agent:** ${role} · **Release:** \`${brief.release}\``,
    `> **Target length:** ~${targetWords} words · **Primary route:** \`${chapter.primaryRoute}\``,
    "",
    "## Learning objectives",
    "",
    `After completing this chapter, you will be able to navigate to \`${chapter.primaryRoute}\`, execute the prescribed task flow, and verify ${chapter.featureIds.join(" / ")} controls using tenant-scoped session context.`,
    "",
    buildFeatureLocationSection(chapter),
    buildNavigationTable(chapter),
    buildScreenshotBlock(chapter),
    buildLabSequence(chapter, brief),
    buildExtendedProcedures(chapter, brief),
    buildTrainingFaq(chapter),
    "## Operational context (Ironframe ingress)",
    "",
    sanitizeSegment(buildBriefContextBlock(brief), MAX_CONTEXT_CHARS),
    "",
    buildVerificationChecklist(chapter),
    buildSourceFooter(chapter, brief),
  ];

  return sections.join("\n");
}

export type GenerateTrainingChapterOptions = {
  trainerChapterDrafts?: Readonly<Record<string, string>>;
};

function finalizeChapterContent(
  synthesized: string,
  chapter: TrainingChapterManifestEntry,
  brief: IronframeDocumentationBrief,
  deterministicDraft: string,
): string {
  let content = synthesized.trim();
  if (!content || content.length < 800) {
    return deterministicDraft;
  }

  const parityViolations = screenTrainingAppDocumentationParity(content, chapter, brief);
  if (parityViolations.length > 0) {
    console.warn(
      `[TrainingChapterGenerator] App-doc parity failed for ${chapter.slug}: ${parityViolations.join(" | ")}`,
    );
    return deterministicDraft;
  }

  if (!content.includes("source-file:") && !content.includes("ref:")) {
    content = `${content}\n\n${buildSourceFooter(chapter, brief)}`;
  }

  if (!content.includes("![")) {
    content = `${content}\n\n${buildScreenshotBlock(chapter)}`;
  }

  return content;
}

export async function generateTrainingChapterContent(
  chapter: TrainingChapterManifestEntry,
  brief: IronframeDocumentationBrief,
  options: GenerateTrainingChapterOptions = {},
): Promise<string> {
  const deterministicDraft = buildDeterministicTrainingChapter(chapter, brief);
  const apiKey = getIronboardApiKey();

  if (!apiKey) {
    return deterministicDraft;
  }

  const trainerBlueprint = buildTrainerChapterBlueprint(chapter, brief);
  const canonicalAppDocs = buildCanonicalAppDocContext(chapter, brief);
  const peerTrainerExcerpt = buildPeerTrainerExcerpt(
    chapter.authorAgent === "board-writer"
      ? resolvePeerTrainerChapterSlug(chapter.slug)
      : null,
    options.trainerChapterDrafts ?? {},
  );

  const systemInstruction = buildGroundedSystemPrompt("WRITER");

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await withGeminiRateLimitRetry(
      () =>
        ai.models.generateContent({
          model: getIronboardGeminiModel(),
          contents: buildCollaborativeWriterPrompt({
            chapter,
            brief,
            trainerBlueprint,
            canonicalAppDocs,
            peerTrainerExcerpt,
            structuralBackbone: deterministicDraft,
          }),
          config: {
            systemInstruction,
            temperature: DETERMINISTIC_GENERATION_PARAMS.temperature,
            topP: DETERMINISTIC_GENERATION_PARAMS.topP,
            maxOutputTokens: MAX_OUTPUT_TOKENS,
          },
        }),
      { label: "training-chapter-collaboration" },
    );

    const synthesized = response.text?.trim() ?? "";
    return finalizeChapterContent(synthesized, chapter, brief, deterministicDraft);
  } catch (error) {
    console.warn(
      `[TrainingChapterGenerator] Collaborative synthesis failed for ${chapter.slug}:`,
      error instanceof Error ? error.message : error,
    );
    return deterministicDraft;
  }
}

export function buildTrainingIndexMarkdown(
  track: "LEVEL_1" | "LEVEL_2",
  brief: IronframeDocumentationBrief,
  chapterSlugs: string[],
): string {
  const manifest = loadTrainingCorpusManifest();
  const chapters = manifest.chapters.filter((c) => chapterSlugs.includes(c.slug));
  const indexTitle =
    track === "LEVEL_1"
      ? "Level 1 Training Index — Student Track"
      : "Level 2 Training Index — GRC Practitioner Track";

  const tableRows = chapters
    .map((c) => {
      const readerPath = `/docs/${c.slug}`;
      return `| ${c.title.replace(/^Chapter \d+ — /, "")} | [${c.slug}](${readerPath}) | \`${c.primaryRoute}\` |`;
    })
    .join("\n");

  const totalWords = manifest.chapters.length * manifest.chapterTargetWords;
  const estimatedPages = Math.ceil(totalWords / manifest.wordsPerPage);

  return [
    `# ${indexTitle}`,
    "",
    `> Generated by ${track === "LEVEL_1" ? "board-trainer" : "board-writer"} · release \`${brief.release}\` · ~${estimatedPages} pages`,
    "",
    "## Corpus status",
    "",
    `- **Chapters:** ${manifest.chapters.length}`,
    `- **Target words per chapter:** ${manifest.chapterTargetWords}`,
    `- **Minimum manual page target:** ${manifest.targetPageCount}+ (${manifest.wordsPerPage} words/page)`,
    "",
    "## Chapter index",
    "",
    "| Chapter | In-app path | Primary SaaS route |",
    "|---------|-------------|-------------------|",
    tableRows,
    "",
    "## Screenshot assets",
    "",
    `All chapters reference PNG assets under \`${manifest.screenshotBasePath}/\`.`,
    "Run `npm run training:screenshots` from the repo root to capture live UI screenshots.",
    "",
    "source-file: config/training-corpus-manifest.json",
    `ref: GET /api/board/shared-context · emittedAt=${brief.emittedAt}`,
  ].join("\n");
}
