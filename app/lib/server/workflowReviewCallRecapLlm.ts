import "server-only";

import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateObject } from "ai";
import { z } from "zod";

import { resolveGeminiFlashModel } from "@/app/config/geminiModels";
import { normalizeLiveTranscriptChunk } from "@/app/lib/operations/liveTranscriptHygiene";
import {
  analyzeWorkflowReviewTranscript,
  buildWorkflowReviewCallRecap,
  type WorkflowReviewActionItem,
  type WorkflowReviewCallRecap,
} from "@/app/lib/server/workflowReviewCallAssistCore";
import {
  DESIGN_PARTNER_DEFAULT_WINDOW_DAYS,
  WORKFLOW_REVIEW_CTA_MINUTES,
  formatPathBUsd,
} from "@/lib/ironframeProductKnowledge/commercial";

const llmRecapSchema = z.object({
  summary: z
    .array(z.string().min(8).max(400))
    .min(2)
    .max(8)
    .describe("Factual bullets of what was actually discussed — dates, topics, decisions."),
  decisions: z
    .array(z.string().min(4).max(240))
    .max(6)
    .describe("Explicit decisions or agreements from the buffer. Empty if none."),
  actionItems: z
    .array(
      z.object({
        owner: z.enum(["operator", "prospect", "shared"]),
        text: z.string().min(8).max(240),
        priority: z.enum(["now", "this_week", "later"]),
      }),
    )
    .min(1)
    .max(10),
  openQuestions: z.array(z.string().min(4).max(240)).max(6),
  pathBAsk: z
    .string()
    .min(8)
    .max(400)
    .describe(
      "Path B commercial next step only if the transcript supports it; otherwise say no Path B ask and state the real follow-up.",
    ),
  meetingType: z
    .enum(["prospect_workflow_review", "ops_sync", "internal", "unclear"])
    .describe("Best-fit classification of the conversation."),
});

export type LlmRecapDraft = z.infer<typeof llmRecapSchema>;

function resolveApiKey(): string | null {
  const key = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GOOGLE_API_KEY;
  return key?.trim() || null;
}

function buildMarkdown(input: {
  company: string;
  contactName: string | null;
  channel: string;
  wordCount: number;
  closeBand: string;
  closeScore: number;
  summary: string[];
  pathBAsk: string;
  actionItems: WorkflowReviewActionItem[];
  buyingSignals: WorkflowReviewCallRecap["buyingSignals"];
  objections: WorkflowReviewCallRecap["objections"];
  openQuestions: string[];
}): string {
  return [
    `# Workflow review recap — ${input.company}`,
    "",
    `- Contact: ${input.contactName ?? "—"}`,
    `- Channel: ${input.channel}`,
    `- Close readiness: ${input.closeBand} (${input.closeScore}/100)`,
    `- Words in buffer: ${input.wordCount}`,
    "",
    "## Summary",
    ...input.summary.map((s) => `- ${s}`),
    "",
    "## Path B ask",
    input.pathBAsk,
    "",
    "## Action items",
    ...input.actionItems.map((a) => `- (${a.owner} · ${a.priority}) ${a.text}`),
    "",
    "## Buying signs",
    ...(input.buyingSignals.length
      ? input.buyingSignals.map((s) => `- ${s.label} [${s.strength}]`)
      : ["- None detected"]),
    "",
    "## Objections",
    ...(input.objections.length
      ? input.objections.map((o) => `- ${o.label}: ${o.suggestedReply}`)
      : ["- None detected"]),
    "",
    "## Open questions",
    ...(input.openQuestions.length
      ? input.openQuestions.map((q) => `- ${q}`)
      : ["- None captured"]),
  ].join("\n");
}

/** Pure merge — unit-testable without calling Gemini. */
export function assembleRecapFromLlmDraft(input: {
  company?: string;
  contactName?: string;
  channel?: "teams" | "zoom" | "meet" | "other";
  transcript: string;
  draft: LlmRecapDraft;
}): WorkflowReviewCallRecap {
  const company = String(input.company ?? "").trim() || "Prospect";
  const contactName = String(input.contactName ?? "").trim() || null;
  const channel = input.channel ?? "teams";
  const transcript = normalizeLiveTranscriptChunk(input.transcript);
  const analysis = analyzeWorkflowReviewTranscript(transcript);

  const header = `${company}${contactName ? ` · ${contactName}` : ""} — ${
    input.draft.meetingType === "ops_sync" || input.draft.meetingType === "internal"
      ? "ops/sync notes"
      : "workflow review"
  } via ${channel}.`;

  const summary = [
    header,
    ...input.draft.summary.map((s) => s.trim()).filter(Boolean),
    ...input.draft.decisions.map((d) => `Decision: ${d.trim()}`),
  ].slice(0, 12);

  if (analysis.buyingSignals.length > 0) {
    summary.push(
      `Buying signs: ${analysis.buyingSignals.map((s) => s.label).join("; ")}.`,
    );
  }
  if (analysis.objections.length > 0) {
    summary.push(
      `Objections heard: ${analysis.objections.map((o) => o.label).join("; ")}.`,
    );
  }

  const actionItems: WorkflowReviewActionItem[] = input.draft.actionItems.map((item) => ({
    owner: item.owner,
    text: item.text.trim(),
    priority: item.priority,
  }));

  // Commercial lock overlay when heuristics see a real Path B close path.
  if (
    analysis.closeReadiness.band === "high" ||
    analysis.buyingSignals.some((s) => s.id === "NEXT_STEP_ORDER" || s.id === "ASKS_PRICE")
  ) {
    const orderText = `Send Path B order form (${formatPathBUsd()} · ${DESIGN_PARTNER_DEFAULT_WINDOW_DAYS}-day) with 2–3 written success criteria fields.`;
    if (!actionItems.some((a) => /order form|path\s*b/i.test(a.text))) {
      actionItems.unshift({ owner: "operator", text: orderText, priority: "now" });
    }
  }

  const seen = new Set<string>();
  const deduped = actionItems
    .filter((item) => {
      const key = `${item.owner}:${item.text.toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 10);

  let pathBAsk = input.draft.pathBAsk.trim();
  if (
    analysis.closeReadiness.band === "high" &&
    !/path\s*b|\$4,?999|order form/i.test(pathBAsk)
  ) {
    pathBAsk = `Ask now: Path B at ${formatPathBUsd()} for ${DESIGN_PARTNER_DEFAULT_WINDOW_DAYS} days with 2–3 written success metrics + client-owned operator email.`;
  } else if (
    analysis.closeReadiness.band === "low" &&
    analysis.buyingSignals.length === 0 &&
    /earn the right to path b|hard-pitch|do not pitch/i.test(pathBAsk)
  ) {
    pathBAsk =
      "No Path B ask from this buffer — capture the scheduled follow-up and discussed topics first.";
  }

  const openQuestions = [
    ...input.draft.openQuestions.map((q) => q.trim()).filter(Boolean),
    ...analysis.unansweredProspectQuestions,
  ]
    .filter((q, i, arr) => arr.findIndex((x) => x.toLowerCase() === q.toLowerCase()) === i)
    .slice(0, 8);

  const buyingSignals = analysis.buyingSignals.map((s) => ({
    label: s.label,
    strength: s.strength,
  }));
  const objections = analysis.objections.map((o) => ({
    label: o.label,
    suggestedReply: o.suggestedReply,
  }));

  return {
    generatedAt: new Date().toISOString(),
    company,
    contactName,
    channel,
    wordCount: analysis.wordCount,
    summary,
    buyingSignals,
    objections,
    openQuestions,
    actionItems: deduped,
    pathBAsk,
    closeReadiness: analysis.closeReadiness,
    markdown: buildMarkdown({
      company,
      contactName,
      channel,
      wordCount: analysis.wordCount,
      closeBand: analysis.closeReadiness.band,
      closeScore: analysis.closeReadiness.score,
      summary,
      pathBAsk,
      actionItems: deduped,
      buyingSignals,
      objections,
      openQuestions,
    }),
  };
}

/**
 * Full LLM meeting summary for the LIVE desk recap.
 * Falls back to rule-based recap if the key/model fails.
 */
export async function buildWorkflowReviewCallRecapAsync(input: {
  transcript: string;
  company?: string;
  contactName?: string;
  channel?: "teams" | "zoom" | "meet" | "other";
}): Promise<{ recap: WorkflowReviewCallRecap; source: "llm" | "rules" }> {
  const transcript = normalizeLiveTranscriptChunk(String(input.transcript ?? ""));
  if (!transcript) {
    return {
      recap: buildWorkflowReviewCallRecap(input),
      source: "rules",
    };
  }

  const apiKey = resolveApiKey();
  if (!apiKey) {
    return { recap: buildWorkflowReviewCallRecap(input), source: "rules" };
  }

  const company = String(input.company ?? "").trim() || "Prospect";
  const contactName = String(input.contactName ?? "").trim() || null;
  const channel = input.channel ?? "teams";
  const modelId = resolveGeminiFlashModel(
    process.env.GEMINI_WORKFLOW_REVIEW_RECAP_MODEL,
    process.env.GEMINI_OPS_WORKER_CHAT_MODEL,
    process.env.GEMINI_NARRATE_MODEL,
  );

  try {
    const google = createGoogleGenerativeAI({ apiKey });
    const { object } = await generateObject({
      model: google(modelId),
      schema: llmRecapSchema,
      temperature: 0,
      prompt: `
You write operator call recaps for Ironframe LIVE desk (10–15 min workflow reviews and ops syncs).

Rules:
- Base EVERY bullet only on the transcript. Do not invent attendees, prices, or commitments.
- Prefer concrete facts: dates, times, vendors (e.g. Textbelt), decisions, owners.
- Conversations vary — summarize what was actually said, not a canned Path B pitch.
- Path B commercial lock (only when the transcript supports a commercial next step): ${formatPathBUsd()} · ${DESIGN_PARTNER_DEFAULT_WINDOW_DAYS}-day · 2–3 written success metrics · non-refundable · convert credit to year-1 Command. CTA length ~${WORKFLOW_REVIEW_CTA_MINUTES} min.
- If this is an internal/ops sync (SMS provider, tooling, scheduling) with no prospect buying talk, set meetingType accordingly and pathBAsk must say there is no Path B ask.
- Action items must be specific and usable on a calendar.

Context:
- Company: ${company}
- Contact: ${contactName ?? "—"}
- Channel: ${channel}

TRANSCRIPT:
"""
${transcript.slice(0, 60_000)}
"""
`.trim(),
    });

    return {
      recap: assembleRecapFromLlmDraft({
        company,
        contactName: contactName ?? undefined,
        channel,
        transcript,
        draft: object,
      }),
      source: "llm",
    };
  } catch (err) {
    console.error("[workflow-review-recap] LLM recap failed; using rules fallback", err);
    return { recap: buildWorkflowReviewCallRecap(input), source: "rules" };
  }
}
