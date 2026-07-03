import { GoogleGenAI } from "@google/genai";

import { getIronboardApiKey, getIronboardGeminiModel } from "../loadIronboardEnv.js";
import { withGeminiRateLimitRetry } from "../lib/geminiRetry.js";
import type { BoardModelHandle } from "../config/modelFactory.js";

export type BoardAgentLlmInput = {
  model: BoardModelHandle;
  roleLabel: string;
  stateSummary: string;
};

/**
 * Generative board-agent execution — shares LangGraph state context via `stateSummary`.
 * Falls back to deterministic prose when Gemini is unavailable (missing API key).
 */
export async function generateBoardAgentAssessment(input: BoardAgentLlmInput): Promise<string> {
  const apiKey = getIronboardApiKey();
  if (!apiKey) {
    return `[${input.roleLabel}] Gemini unavailable — deterministic board assessment retained. ${input.stateSummary.slice(0, 240)}`;
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await withGeminiRateLimitRetry(
      () =>
        ai.models.generateContent({
          model: getIronboardGeminiModel(),
          contents: input.stateSummary,
          config: {
            systemInstruction: input.model.systemPrompt,
            temperature: input.model.generation.temperature,
            topP: input.model.generation.topP,
            maxOutputTokens: 640,
          },
        }),
      { label: `board-agent-${input.roleLabel}` },
    );
    const text = response.text?.trim();
    if (text) return text;
    return `[${input.roleLabel}] Empty model response — state context preserved.`;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return `[${input.roleLabel}] Assessment deferred: ${message}`;
  }
}
