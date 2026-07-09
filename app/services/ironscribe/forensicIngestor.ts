import "server-only";

import { createHash } from "crypto";
import { generateText } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import type { RequirementBlock } from "@/app/types/regulatoryIngestion";
import { resolveGeminiFlashModel } from "@/app/config/geminiModels";

const OCR_MODEL = resolveGeminiFlashModel(process.env.GEMINI_IRONSIGHT_MODEL);

export type ForensicIngestInput = {
  buffer: Buffer;
  filename: string;
  mimeType: string;
  authority: string;
  sourceUrl: string;
};

/** Strip weak PDF binary to approximate text when Gemini unavailable. */
function naivePdfTextExtract(buffer: Buffer): string {
  const raw = buffer.toString("latin1");
  const chunks = raw.match(/\((?:\\.|[^\\)]){8,}\)/g) ?? [];
  const fromParens = chunks.map((c) => c.slice(1, -1).replace(/\\n/g, "\n")).join("\n");
  const streams = raw.match(/stream[\s\S]*?endstream/g) ?? [];
  const fromStreams = streams
    .map((s) => s.replace(/stream|endstream/g, "").replace(/[^\x20-\x7E\n]/g, " "))
    .join("\n");
  return (fromParens || fromStreams).slice(0, 120_000);
}

export async function extractDocumentText(input: ForensicIngestInput): Promise<string> {
  const lower = input.filename.toLowerCase();
  if (lower.endsWith(".md") || lower.endsWith(".txt")) {
    return input.buffer.toString("utf8").slice(0, 200_000);
  }
  if (lower.endsWith(".html") || lower.endsWith(".htm")) {
    return input.buffer
      .toString("utf8")
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .slice(0, 200_000);
  }

  const naive = naivePdfTextExtract(input.buffer);
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim();
  if (apiKey && naive.length > 40 && (lower.endsWith(".pdf") || input.mimeType.includes("pdf"))) {
    try {
      const google = createGoogleGenerativeAI({ apiKey });
      const { text } = await generateText({
        model: google(OCR_MODEL),
        prompt: `You are Ironscribe (Agent 5). Clean and structure this extracted regulatory PDF text (${input.filename}, ${input.authority}). Preserve section numbers and requirements.\n\n${naive.slice(0, 24_000)}`,
        maxOutputTokens: 8192,
      });
      if (text.trim().length > 80) return text.trim().slice(0, 200_000);
    } catch {
      /* fall through */
    }
  }

  return naive.length > 40 ? naive : input.buffer.toString("utf8").slice(0, 200_000);
}

function inferAssetImpact(text: string): RequirementBlock["assetImpact"] {
  const lower = text.toLowerCase();
  if (/critical|breach notification|30.day|safeguards rule/i.test(lower)) return "CRITICAL";
  if (/high.risk|material|substantial/i.test(lower)) return "HIGH";
  if (/monitor|report|annual/i.test(lower)) return "MEDIUM";
  return "LOW";
}

function inferEffectiveDate(text: string): string | null {
  const iso = text.match(/(20\d{2})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}T00:00:00.000Z`;
  const verbal = text.match(/effective\s+(?:on\s+)?([A-Za-z]+\s+\d{1,2},?\s+20\d{2})/i);
  if (verbal) {
    const d = Date.parse(verbal[1]);
    if (Number.isFinite(d)) return new Date(d).toISOString();
  }
  return null;
}

/**
 * Break regulation text into tagged requirement blocks (Ironscribe section extraction).
 */
export function extractRequirementBlocks(
  fullText: string,
  meta: { authority: string; title: string },
): RequirementBlock[] {
  const blocks: RequirementBlock[] = [];
  const chunks = fullText.split(/\n(?=(?:§|\d+\.|\d+\.\d+|Chapter\s+\d+|Section\s+\d+))/i);

  for (let i = 0; i < chunks.length; i += 1) {
    const body = chunks[i].trim();
    if (body.length < 40) continue;
    const head = body.split("\n")[0]?.trim() ?? `Block ${i + 1}`;
    const sectionRef =
      head.match(/^(?:§|Section|Chapter)\s*[\d.A-Za-z-]+/i)?.[0] ?? `§${i + 1}`;
    const blockId = createHash("sha256")
      .update(`${meta.authority}|${meta.title}|${sectionRef}|${body.slice(0, 200)}`, "utf8")
      .digest("hex")
      .slice(0, 12);

    blocks.push({
      blockId,
      sectionRef,
      title: head.slice(0, 120),
      body: body.slice(0, 4000),
      effectiveDate: inferEffectiveDate(body),
      authority: meta.authority,
      assetImpact: inferAssetImpact(body),
    });
  }

  if (blocks.length === 0 && fullText.trim().length > 40) {
    blocks.push({
      blockId: createHash("sha256").update(fullText.slice(0, 500), "utf8").digest("hex").slice(0, 12),
      sectionRef: "§1",
      title: meta.title.slice(0, 120),
      body: fullText.trim().slice(0, 8000),
      effectiveDate: inferEffectiveDate(fullText),
      authority: meta.authority,
      assetImpact: inferAssetImpact(fullText),
    });
  }

  return blocks.slice(0, 40);
}

export async function ironscribeForensicIngest(
  input: ForensicIngestInput,
): Promise<{ text: string; blocks: RequirementBlock[]; sha256: string }> {
  const text = await extractDocumentText(input);
  const sha256 = createHash("sha256").update(input.buffer).digest("hex");
  const blocks = extractRequirementBlocks(text, {
    authority: input.authority,
    title: input.filename,
  });
  return { text, blocks, sha256 };
}
