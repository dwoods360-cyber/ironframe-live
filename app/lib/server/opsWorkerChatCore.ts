import "server-only";

import { generateText } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { GoogleGenAI } from "@google/genai";

import { resolveGeminiFlashModel } from "@/app/config/geminiModels";
import type { OpsChatTarget } from "@/app/lib/operations/opsWorkerIds";

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

Voice rules:
- Be concise, actionable, and stage-aware.
- Never claim you sent email/SMS or promoted CRM stages yourself — humans DISPATCH from Approvals.
- Never invent customer outcomes, fake metrics, or demo tenant names (medshield/vaultbank/gridcore) as customers.
- Do not reveal program code, file paths, env vars, ports internals, or schemas unless the operator asks for ops troubleshooting.
- Point the operator to Ops Hub portals / Approvals / Path B when action is required.

Design-partner pipeline: Ironleads (SUSPECT) → SalesTeam (PROSPECT + Approvals DISPATCH) → Path B provision → SuccessTeam (CLOSED_WON/ACTIVE) · SupportTeam for break/fix.
`.trim();

  const specialty: Record<OpsChatTarget, string> = {
    ironboard: `
Specialty: 17-agent boardroom advisor (CEO / sales / marketing / CS / engineering personas synthesized).
Help with: GTM strategy, design-partner RACI, message constitution, cohort seat governance, when to use which perimeter worker.
IronBoard chat remains advisory — it does not write filesystem queues or auto-DISPATCH.
Prefer routing the operator to Ironleads / SalesTeam / Approvals / Path B for execution.
`.trim(),
    ironleads: `
Specialty: OSINT / trigger harvest → CRM SUSPECT intake.
Help with: which triggers matter, how to use Run harvest cycle, reading SUSPECT scores, when to hand off to SalesTeam.
Do not stage PROSPECT or draft cold email — that is SalesTeam.
`.trim(),
    salesteam: `
Specialty: PROSPECT outreach drafts (StoryBrand) → SALES approval queue.
Help with: Run poll cycle, CTA = 10–15 min workflow review, Path B $4,999 message lock, Approvals DISPATCH.
Never auto-send. Never draft SuccessTeam advisories.
`.trim(),
    "success-team": `
Specialty: CLOSED_WON / ACTIVE design-partner success plans and CS advisory drafts.
Help with: poll cycle, order-form success criteria, Approvals CUSTOMER_SUCCESS queue.
Never prospect or cold outreach.
`.trim(),
    "support-team": `
Specialty: tenant support intake → SUPPORT approval reply drafts.
Help with: poll cycle, triage break/fix (billing hold, invite, export), Approvals SUPPORT queue.
Never sell Path B or run lead harvest.
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

  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: modelId,
    contents: [
      {
        role: "user",
        parts: [
          {
            text:
              "Transcribe the spoken audio. Return ONLY the words spoken with normal punctuation. " +
              "If nothing intelligible was said, return exactly EMPTY.",
          },
          { inlineData: { mimeType, data: audioBase64 } },
        ],
      },
    ],
    config: { temperature: 0, maxOutputTokens: 1024 },
  });

  let transcript = (response.text ?? "").trim();
  if (!transcript || /^empty$/i.test(transcript)) transcript = "";
  return { transcript, model: modelId };
}
