import "server-only";

import { generateText } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";

import { resolveGeminiFlashModel } from "@/app/config/geminiModels";
import { PUBLIC_BRIEFING_DECLASSIFICATION_MANDATE } from "@/app/lib/governanceFrame/publicBriefingDeclassification";
import { buildPublicBriefingAuthoringMandate } from "@/app/lib/governanceFrame/publicBriefingSolutionVoice";
import {
  stageBriefingQueueDraftBatch,
  type StageBriefingQueueBatchResult,
} from "@/app/lib/server/stageBriefingQueueDraftCore";

const REQUEST_MODEL = resolveGeminiFlashModel(
  process.env.GEMINI_NARRATE_MODEL,
  process.env.GEMINI_IRONSIGHT_MODEL,
);

export type GovernanceBriefingEraSpec = {
  filename: string;
  eraLabel: string;
  yearRange: string;
};

export type RequestGovernanceBriefingSeriesInput = {
  /** Operator prompt describing the thought-leadership series. */
  requestPrompt: string;
  /** Default series title prefix. */
  seriesTitle: string;
  eras: GovernanceBriefingEraSpec[];
  /** Existing tenant UUID used only for promotion frontmatter (never named in prose). */
  tenantId: string;
  tenantSlug: string;
  overwrite?: boolean;
};

function buildSystemPrompt(): string {
  return `
You are the Ironframe Governance Frame authorship plane (board-bot / board-cfo style).
You draft PUBLIC thought-leadership briefings for quarantine in docs/briefing-queue/.

${buildPublicBriefingAuthoringMandate(PUBLIC_BRIEFING_DECLASSIFICATION_MANDATE)}

CONSTRAINTS:
- Output ONE markdown document only for the requested era.
- Include YAML frontmatter with title, date (ISO date), status QUARANTINED_DRAFT, classification Institutional Governance, category market-analysis, tenantId and tenantSlug exactly as provided, activeExposureCents "0", requiresImmediatePromotion false.
- Include Executive Summary then sections I, II, III, optional IV, and V. Sources & Citations.
- Section II monetary figures must be cited statutory/settlement amounts as integer cents AND USD — never invent uncited ALE.
- StoryBrand-aligned; position Ironframe on quantified ALE + tenant isolation, NOT SOC 2 speed-to-cert.
- No demo tenant names (medshield, vaultbank, gridcore), no unpublished roadmap, no asterisks for bold.
- Prefer primary sources with real URLs + retrieved dates in Section V.
- Do not promote or syndicate language — quarantine draft only.
`.trim();
}

function extractMarkdownDocument(raw: string): string {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:markdown|md)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return fenced[1].trim();
  return trimmed;
}

export async function requestGovernanceBriefingSeriesCore(
  input: RequestGovernanceBriefingSeriesInput,
): Promise<StageBriefingQueueBatchResult & { generated: number }> {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return {
      ok: false,
      staged: [],
      failed: [
        {
          filename: "(series)",
          error: "GOOGLE_API_KEY / GOOGLE_GENERATIVE_AI_API_KEY missing — cannot generate drafts.",
        },
      ],
      generated: 0,
    };
  }

  const google = createGoogleGenerativeAI({ apiKey });
  const drafts: Array<{ filename: string; markdown: string; overwrite?: boolean }> = [];
  const failed: StageBriefingQueueBatchResult["failed"] = [];

  for (const era of input.eras) {
    try {
      const { text } = await generateText({
        model: google(REQUEST_MODEL),
        temperature: 0,
        system: buildSystemPrompt(),
        prompt: `
SERIES TITLE: ${input.seriesTitle}
ERA: ${era.eraLabel} (${era.yearRange})
OUTPUT FILENAME (do not invent another): ${era.filename}
FRONTMATTER tenantId: ${input.tenantId}
FRONTMATTER tenantSlug: ${input.tenantSlug}

OPERATOR REQUEST:
${input.requestPrompt}

Write the complete quarantine-ready markdown for this era only.
`.trim(),
      });
      drafts.push({
        filename: era.filename,
        markdown: extractMarkdownDocument(text),
        overwrite: input.overwrite === true,
      });
    } catch (err) {
      failed.push({
        filename: era.filename,
        error: err instanceof Error ? err.message : "Generation failed.",
      });
    }
  }

  const stagedBatch = stageBriefingQueueDraftBatch(drafts);
  return {
    ok: stagedBatch.failed.length === 0 && failed.length === 0 && stagedBatch.staged.length > 0,
    staged: stagedBatch.staged,
    failed: [...failed, ...stagedBatch.failed],
    generated: drafts.length,
  };
}
