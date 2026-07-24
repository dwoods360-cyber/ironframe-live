import "server-only";

import { generateText } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { GoogleGenAI } from "@google/genai";

import { resolveGeminiFlashModel } from "@/app/config/geminiModels";
import {
  buildWorkflowReviewSttPrompt,
  normalizeLiveTranscriptChunk,
} from "@/app/lib/operations/liveTranscriptHygiene";
import type { OpsChatTarget } from "@/app/lib/operations/opsWorkerIds";
import {
  buildIronleadsMandate,
  buildProductKnowledgeBinding,
  buildSalesTeamLaunchMandate,
  buildSuccessTeamMandate,
  buildSupportTeamMandate,
} from "@/lib/ironframeProductKnowledge/boardBinding";
import { buildAntiHallucinationMandate } from "@/lib/ironframeProductKnowledge/productFacts";

export type { OpsChatTarget, OpsWorkerId } from "@/app/lib/operations/opsWorkerIds";
export {
  isOpsChatTarget,
  isOpsWorkerId,
  OPS_CHAT_TARGETS,
  OPS_WORKER_IDS,
} from "@/app/lib/operations/opsWorkerIds";

const TARGET_LABEL: Record<OpsChatTarget, string> = {
  ironboard: "IronBoard",
  ironleads: "Ironleads",
  salesteam: "SalesTeam",
  "success-team": "IronSuccessTeam",
  "support-team": "IronSupportTeam",
};

function targetSystemPrompt(target: OpsChatTarget): string {
  const shared = `
You are the conversational operator console for ${TARGET_LABEL[target]} inside Ironframe Ops Hub.
Audience: GLOBAL_ADMIN / BUSINESS_ADMIN operators only (not tenants).

${buildAntiHallucinationMandate()}

Voice rules:
- Be concise, actionable, and stage-aware. Prefer plain human-readable prose — never invent markdown training chapters.
- Never claim you sent email/SMS or promoted CRM stages yourself — humans DISPATCH from Approvals.
- Never invent customer outcomes, fake metrics, portals, Knowledge Bases, routes, layouts, or demo tenant names (medshield/vaultbank/gridcore) as customers.
- If you cannot verify a SaaS fact from the product spine below, say you cannot verify it.
- Do not reveal program code, file paths, env vars, ports internals, or schemas unless the operator asks for ops troubleshooting.
- Point the operator to Ops Hub portals / Approvals / Path B when *execution* is required (DISPATCH, poll, provision).
- Partner learning documents live on Core /docs and /get-started — never claim Approvals or Success Portal stores training manuals.
- Location answers ("where is the docs hub?") = plain prose only — never markdown training chapters, never claim /docs uses Command Center 22/48/30 tripane.

Design-partner pipeline: Ironleads (SUSPECT) → SalesTeam (PROSPECT + Approvals DISPATCH) → Path B provision → SuccessTeam (CLOSED_WON/ACTIVE) · SupportTeam for break/fix.
`.trim();

  const specialty: Record<OpsChatTarget, string> = {
    ironboard: `
Specialty: 17-agent boardroom advisor (CEO / sales / marketing / CS / engineering personas synthesized).
Help with: GTM strategy, design-partner RACI, message constitution, cohort seat governance, when to use which perimeter worker.
IronBoard chat remains advisory — it does not write filesystem queues or auto-DISPATCH.
Prefer routing the operator to Ironleads / SalesTeam / Approvals / Path B for execution.

${buildProductKnowledgeBinding()}
`.trim(),
    ironleads: `
Specialty: OSINT / trigger harvest → CRM SUSPECT intake.
Help with: which triggers matter, how to use Run harvest cycle, reading SUSPECT scores, when to hand off to SalesTeam.
Do not stage PROSPECT or draft cold email — that is SalesTeam.

${buildIronleadsMandate()}
`.trim(),
    salesteam: `
Specialty: PROSPECT outreach drafts (StoryBrand) → SALES approval queue.
Help with: Run poll cycle, CTA = 10–15 min workflow review, Path B $4,999 message lock, Approvals DISPATCH.
Never auto-send. Never draft SuccessTeam advisories.

${buildSalesTeamLaunchMandate()}
`.trim(),
    "success-team": `
Specialty: CLOSED_WON / ACTIVE design-partner success plans, adoption coaching, and CS advisory drafts.
Help with: poll cycle, order-form success criteria, partner learning handoff, Approvals CUSTOMER_SUCCESS queue (HITL send only).
Never prospect or cold outreach.

${buildSuccessTeamMandate()}
`.trim(),
    "support-team": `
Specialty: tenant support intake → SUPPORT approval reply drafts.
Help with: poll cycle, triage break/fix (billing hold, invite, export), Approvals SUPPORT queue.
Never sell Path B or run lead harvest.

${buildSupportTeamMandate()}
`.trim(),
  };

  return `${shared}\n\n${specialty[target]}`;
}

export type OpsWorkerChatTurn = { role: "user" | "assistant"; text: string };

function resolveApiKey(): string | null {
  const key = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GOOGLE_API_KEY;
  return key?.trim() || null;
}

export async function runOpsWorkerChat(input: {
  worker: OpsChatTarget;
  message: string;
  history?: OpsWorkerChatTurn[];
}): Promise<{ reply: string; model: string }> {
  const apiKey = resolveApiKey();
  if (!apiKey) {
    throw new Error("GOOGLE_API_KEY / GOOGLE_GENERATIVE_AI_API_KEY missing.");
  }

  const modelId = resolveGeminiFlashModel(
    process.env.GEMINI_OPS_WORKER_CHAT_MODEL,
    process.env.GEMINI_NARRATE_MODEL,
    process.env.GEMINI_IRONSIGHT_MODEL,
  );
  const google = createGoogleGenerativeAI({ apiKey });
  const prior = (input.history ?? [])
    .slice(-8)
    .map((turn) => `${turn.role === "user" ? "Operator" : TARGET_LABEL[input.worker]}: ${turn.text}`)
    .join("\n\n");

  const { text } = await generateText({
    model: google(modelId),
    temperature: 0,
    system: targetSystemPrompt(input.worker),
    prompt: `
${prior ? `RECENT THREAD:\n${prior}\n\n` : ""}OPERATOR:
${input.message.trim()}

Reply as ${TARGET_LABEL[input.worker]} only.
`.trim(),
  });

  return { reply: (text ?? "").trim() || "(No reply generated.)", model: modelId };
}

export async function transcribeOpsWorkerAudio(input: {
  audioBase64: string;
  mimeType?: string;
  /** LIVE workflow desk uses domain-aware STT + mishear cleanup. */
  context?: "workflow-review" | "ops-worker" | string;
}): Promise<{ transcript: string; model: string }> {
  const apiKey = resolveApiKey();
  if (!apiKey) {
    throw new Error("GOOGLE_API_KEY / GOOGLE_GENERATIVE_AI_API_KEY missing.");
  }

  const modelId = resolveGeminiFlashModel(
    process.env.GEMINI_OPS_WORKER_CHAT_MODEL,
    process.env.GEMINI_NARRATE_MODEL,
  );
  const mimeType =
    String(input.mimeType ?? "audio/webm").split(";")[0].trim().toLowerCase() || "audio/webm";
  const audioBase64 = input.audioBase64.trim();
  if (audioBase64.length < 64) {
    throw new Error("AUDIO_REQUIRED");
  }
  if (audioBase64.length > 9_000_000) {
    throw new Error("AUDIO_TOO_LARGE");
  }

  const sttPrompt =
    input.context === "workflow-review"
      ? buildWorkflowReviewSttPrompt()
      : "You are a speech-to-text engine. Transcribe the audio verbatim.\n" +
        "Rules:\n" +
        "- Return ONLY the spoken words with normal punctuation.\n" +
        "- Do not apologize, explain, translate, or add commentary.\n" +
        "- Do not invent words that were not spoken.\n" +
        "- If the audio is silent, music-only, or unintelligible, return exactly EMPTY.";

  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: modelId,
    contents: [
      {
        role: "user",
        parts: [
          { text: sttPrompt },
          { inlineData: { mimeType, data: audioBase64 } },
        ],
      },
    ],
    config: { temperature: 0, maxOutputTokens: 1024 },
  });

  let transcript = (response.text ?? "").trim();
  // Strip common model wrappers / silence hallucinations.
  transcript = transcript
    .replace(/^["'`]+|["'`]+$/g, "")
    .replace(/^\s*transcript\s*:\s*/i, "")
    .trim();
  if (!transcript || /^empty$/i.test(transcript)) transcript = "";
  if (
    /^(i'?m sorry\.?|i am sorry\.?|sorry\.?|thank you\.?|thanks\.?|please subscribe\.?|you$'?re welcome\.?)$/i.test(
      transcript,
    )
  ) {
    transcript = "";
  }
  if (transcript && input.context === "workflow-review") {
    transcript = normalizeLiveTranscriptChunk(transcript);
  }
  return { transcript, model: modelId };
}
