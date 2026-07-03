import "server-only";

import { createHash, randomUUID } from "node:crypto";

import { GoogleGenAI } from "@google/genai";

import { sanitizeAppDocumentContent } from "@/lib/appDocumentSanitizer";
import prisma from "@/lib/prisma";

const MAX_TOPIC_CHARS = 500;
const MAX_MESSAGE_CHARS = 2_000;
const MAX_DOC_CONTENT_CHARS = 6_000;
const MAX_CORPUS_DOCS = 14;

export const WRITER_UNGROUNDED_RESPONSE =
  "That topic is not covered in our official Level 2 technical corpus. A platform administrator can assign supplemental specifications.";

export const WRITER_CORPUS_READING_LEVELS = ["LEVEL_2", "TRAINING"] as const;

const SYSTEM_INSTRUCTION = `You are the isolated Technical Writer Agent (board-writer) for the Ironframe/Ironboard GRC platform.
Your mandate is practitioner-level technical documentation only — architecture, API contracts, deployment runbooks, and security controls.

CRITICAL CONSTRAINTS:
- Write for GRC practitioners: precise, structured, citation-heavy prose with short sections and bullet lists where appropriate.
- Cite source slugs from the grounding context when referencing routes, env vars, or API paths.
- Quote financial baselines as whole-integer cent digit strings only — never floating-point dollars.
- Ground every claim ONLY in the Technical Grounding Context provided — never invent endpoints, schema fields, or agent indices.
- Do NOT draft marketing copy, Governance Frame briefings, sales pitches, or executive board narratives.
- Do NOT compute live ALE or assert compliance certification status.
- If the grounding context lacks the requested topic, reply exactly with: "${WRITER_UNGROUNDED_RESPONSE}"
- Output a structured practitioner brief in markdown. No emojis. Temperature is locked at zero — stay deterministic.`;

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

/** Prisma filter — Level 2 technical corpus only (no user-manuals/, level-1 training, or governance planes). */
export function buildWriterCorpusWhere() {
  return {
    readingLevel: { in: [...WRITER_CORPUS_READING_LEVELS] },
    OR: [{ slug: { startsWith: "technical/" } }, { slug: { startsWith: "training/level-2/" } }],
  };
}

type WriterDocRow = {
  slug: string;
  title: string;
  content: string;
};

function rankDocsForTopic(docs: WriterDocRow[], topic: string): WriterDocRow[] {
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

export async function loadWriterGroundingContext(topic: string): Promise<{
  contextBlock: string;
  sourceSlugs: string[];
}> {
  const rows = await prisma.appDocument
    .findMany({
      where: buildWriterCorpusWhere(),
      orderBy: { updatedAt: "desc" },
      take: MAX_CORPUS_DOCS * 2,
      select: { slug: true, title: true, content: true },
    })
    .catch(() => []);

  if (rows.length === 0) {
    return {
      contextBlock:
        "No Level 2 technical corpus is populated in app_documents. Seed via npx tsx scripts/seed-app-documents.ts.",
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

export function resolveWriterApiKey(): string {
  return process.env.GOOGLE_API_KEY?.trim() || process.env.GEMINI_API_KEY?.trim() || "";
}

export function resolveWriterModel(): string {
  return process.env.IRONBOARD_GEMINI_MODEL?.trim() || "gemini-2.5-flash";
}

export type WriterSessionInput = {
  tenantId: string;
  topic: string;
  message?: string;
};

export type WriterSessionResult = {
  sessionId: string;
  brief: string;
  sourceSlugs: string[];
};

export async function synthesizeWriterSession(input: WriterSessionInput): Promise<WriterSessionResult> {
  const apiKey = resolveWriterApiKey();
  if (!apiKey) {
    throw new Error("GEMINI_CREDENTIALS_UNASSIGNED");
  }

  const topic = sanitizeIngressText(input.topic, MAX_TOPIC_CHARS);
  if (!topic) {
    throw new Error("TOPIC_REQUIRED");
  }

  const followUp = sanitizeIngressText(input.message ?? "", MAX_MESSAGE_CHARS);
  const { contextBlock, sourceSlugs } = await loadWriterGroundingContext(topic);
  const sessionId = randomUUID();

  const inputPrompt = `=== TECHNICAL GROUNDING CONTEXT (read-only) ===
${contextBlock}

=== PRACTITIONER REQUEST ===
Topic: ${topic}
${followUp ? `Practitioner notes: ${followUp}` : "Practitioner notes: (none)"}

Compose the technical practitioner brief:`;

  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: resolveWriterModel(),
    contents: inputPrompt,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      temperature: 0.0,
      topP: 0,
      maxOutputTokens: 2_048,
    },
  });

  const brief =
    response.text?.trim() ||
    "Automated technical synthesis could not produce a grounded brief from the available corpus.";

  await logWriterSessionAudit({
    sessionId,
    tenantId: input.tenantId,
    topic,
    sourceSlugs,
    brief,
  });

  return { sessionId, brief, sourceSlugs };
}

export async function logWriterSessionAudit(input: {
  sessionId: string;
  tenantId: string;
  topic: string;
  sourceSlugs: string[];
  brief: string;
}): Promise<void> {
  const payload = {
    tag: "WRITER_SESSION",
    sessionId: input.sessionId,
    topic: input.topic,
    sourceSlugs: input.sourceSlugs,
    outputHash: createHash("sha256").update(input.brief).digest("hex").slice(0, 16),
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
      console.error("[Writer Agent] Audit log persistence failed:", err);
    });
}
