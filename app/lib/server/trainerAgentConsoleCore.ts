import "server-only";

import { createHash, randomUUID } from "node:crypto";

import { GoogleGenAI } from "@google/genai";

import { sanitizeAppDocumentContent } from "@/lib/appDocumentSanitizer";
import { resolveGeminiFlashModel } from "@/app/config/geminiModels";
import prisma from "@/lib/prisma";

const MAX_TOPIC_CHARS = 500;
const MAX_MESSAGE_CHARS = 2_000;
const MAX_DOC_CONTENT_CHARS = 5_000;
const MAX_CORPUS_DOCS = 16;

export const TRAINER_UNGROUNDED_RESPONSE =
  "That topic is not covered in our official training manuals. A platform administrator can assign supplemental material.";

export const TRAINER_CORPUS_READING_LEVELS = ["LEVEL_1", "TRAINING"] as const;

const SYSTEM_INSTRUCTION = `You are the isolated Trainer Agent (board-trainer) for the Ironframe/Ironboard GRC platform.
Your mandate is pedagogical only — you teach operators how to use the platform from official training documentation.

CRITICAL CONSTRAINTS:
- Write at an 11th-grade reading level: plain language, short paragraphs, active voice.
- Use numbered steps for labs, bullet lists for checklists, and **Quick tip:** sidebars for non-obvious operator hints.
- When jargon is unavoidable (ALE, Irongate, WORM, MSSP), add a short **Glossary** block with plain definitions.
- Ground every claim ONLY in the Training Grounding Context provided — never invent routes, roles, or features.
- Do NOT compute ALE, assert compliance certification, or give legal/regulatory advice.
- Do NOT discuss sales pipelines, CRM deals, or executive board strategy.
- You MAY teach messaging clarity from training/level-1/13-clear-messaging-for-operators.md (StoryBrand and Made to Stick for operators only).
- If the grounding context lacks the requested topic, reply exactly with: "${TRAINER_UNGROUNDED_RESPONSE}"
- Output a step-by-step training session in markdown. No emojis. Temperature is locked at zero — stay deterministic.`;

function sanitizeIngressText(raw: string, maxLen: number): string {
  return sanitizeAppDocumentContent(String(raw ?? ""))
    .replace(/javascript:/gi, "")
    .trim()
    .slice(0, maxLen);
}

function tokenizeTopic(topic: string): string[] {
  return topic
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 2);
}

/** Prisma filter — training corpus only (no technical/ or governance planes). */
export function buildTrainerCorpusWhere() {
  return {
    readingLevel: { in: [...TRAINER_CORPUS_READING_LEVELS] },
    OR: [{ slug: { startsWith: "training/" } }, { slug: { startsWith: "user-manuals/" } }],
  };
}

type TrainerDocRow = {
  slug: string;
  title: string;
  content: string;
};

function rankDocsForTopic(docs: TrainerDocRow[], topic: string): TrainerDocRow[] {
  const tokens = tokenizeTopic(topic);
  if (tokens.length === 0) return docs;

  const scored = docs.map((doc) => {
    const haystack = `${doc.slug} ${doc.title} ${doc.content.slice(0, 2_000)}`.toLowerCase();
    const score = tokens.reduce((acc, token) => acc + (haystack.includes(token) ? 1 : 0), 0);
    return { doc, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const matched = scored.filter((row) => row.score > 0).map((row) => row.doc);
  return matched.length > 0 ? matched : docs;
}

export async function loadTrainerGroundingContext(topic: string): Promise<{
  contextBlock: string;
  sourceSlugs: string[];
}> {
  const rows = await prisma.appDocument
    .findMany({
      where: buildTrainerCorpusWhere(),
      orderBy: { updatedAt: "desc" },
      take: MAX_CORPUS_DOCS * 2,
      select: { slug: true, title: true, content: true },
    })
    .catch(() => []);

  if (rows.length === 0) {
    return {
      contextBlock: "No training corpus is populated in app_documents. Seed via npx tsx scripts/seed-app-documents.ts.",
      sourceSlugs: [],
    };
  }

  const ranked = rankDocsForTopic(rows, topic).slice(0, MAX_CORPUS_DOCS);
  const sourceSlugs = ranked.map((row) => row.slug);

  const contextBlock = ranked
    .map((doc) => {
      const content = sanitizeAppDocumentContent(doc.content).slice(0, MAX_DOC_CONTENT_CHARS);
      return `Slug: ${doc.slug}\nTitle: ${doc.title}\nContent:\n${content}`;
    })
    .join("\n\n---\n\n");

  return { contextBlock, sourceSlugs };
}

export function resolveTrainerApiKey(): string {
  return process.env.GOOGLE_API_KEY?.trim() || process.env.GEMINI_API_KEY?.trim() || "";
}

export function resolveTrainerModel(): string {
  return resolveGeminiFlashModel(process.env.IRONBOARD_GEMINI_MODEL);
}

export type TrainerSessionInput = {
  tenantId: string;
  topic: string;
  message?: string;
};

export type TrainerSessionResult = {
  sessionId: string;
  lesson: string;
  sourceSlugs: string[];
};

export async function synthesizeTrainerSession(
  input: TrainerSessionInput,
): Promise<TrainerSessionResult> {
  const apiKey = resolveTrainerApiKey();
  if (!apiKey) {
    throw new Error("GEMINI_CREDENTIALS_UNASSIGNED");
  }

  const topic = sanitizeIngressText(input.topic, MAX_TOPIC_CHARS);
  if (!topic) {
    throw new Error("TOPIC_REQUIRED");
  }

  const followUp = sanitizeIngressText(input.message ?? "", MAX_MESSAGE_CHARS);
  const { contextBlock, sourceSlugs } = await loadTrainerGroundingContext(topic);
  const sessionId = randomUUID();

  const inputPrompt = `=== TRAINING GROUNDING CONTEXT (read-only) ===
${contextBlock}

=== SESSION REQUEST ===
Topic: ${topic}
${followUp ? `Operator notes: ${followUp}` : "Operator notes: (none)"}

Compose the training session:`;

  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: resolveTrainerModel(),
    contents: inputPrompt,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      temperature: 0.0,
      topP: 0,
      maxOutputTokens: 2_048,
    },
  });

  const lesson =
    response.text?.trim() ||
    "Automated training synthesis could not produce a grounded lesson from the available corpus.";

  await logTrainerSessionAudit({
    sessionId,
    tenantId: input.tenantId,
    topic,
    sourceSlugs,
    lesson,
  });

  return { sessionId, lesson, sourceSlugs };
}

export async function logTrainerSessionAudit(input: {
  sessionId: string;
  tenantId: string;
  topic: string;
  sourceSlugs: string[];
  lesson: string;
}): Promise<void> {
  const payload = {
    tag: "TRAINER_SESSION",
    sessionId: input.sessionId,
    topic: input.topic,
    sourceSlugs: input.sourceSlugs,
    outputHash: createHash("sha256").update(input.lesson).digest("hex").slice(0, 16),
    occurredAt: new Date().toISOString(),
  };

  await prisma.agentLog
    .create({
      data: {
        tenantId: input.tenantId,
        message: JSON.stringify(payload).slice(0, 8_000),
      },
    })
    .catch((err: unknown) => {
      console.error("[Trainer Agent] Audit log persistence failed:", err);
    });
}
