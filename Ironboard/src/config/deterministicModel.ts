/**
 * Deterministic LLM generation baseline — zero stochastic drift in board deliberations.
 * Applied to every LangGraph / AI SDK model instantiation in Ironboard.
 */
export const DETERMINISTIC_GENERATION_PARAMS = {
  temperature: 0.0,
  topP: 0.0,
} as const;

export type DeterministicGenerationParams = typeof DETERMINISTIC_GENERATION_PARAMS;

export type BoardModelRole = "CEO" | "CFO" | "CCO" | "LEGAL" | "TRAINER" | "WRITER";

/** Provider-agnostic bind object for ChatOpenAI, Vercel AI SDK `generateText`, etc. */
export function bindDeterministicGeneration<T extends Record<string, unknown>>(
  base: T,
): T & DeterministicGenerationParams {
  return { ...base, ...DETERMINISTIC_GENERATION_PARAMS };
}
