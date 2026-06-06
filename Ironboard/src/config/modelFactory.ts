import {
  bindDeterministicGeneration,
  DETERMINISTIC_GENERATION_PARAMS,
  type BoardModelRole,
} from "./deterministicModel.js";
import { resolveVectorNamespace } from "./vectorNamespaces.js";
import { buildGroundedSystemPrompt, type StrategicPromptRole } from "../prompts.js";

export type BoardModelHandle = {
  role: BoardModelRole;
  generation: typeof DETERMINISTIC_GENERATION_PARAMS;
  systemPrompt: string;
  vectorNamespace: string | null;
};

const PROMPT_ROLE_BY_MODEL: Record<BoardModelRole, StrategicPromptRole> = {
  CEO: "CEO",
  CFO: "CFO",
  CCO: "COMPLIANCE",
  LEGAL: "LEGAL",
  TRAINER: "TRAINER",
  WRITER: "WRITER",
};

/**
 * Instantiate a board agent model block with deterministic generation params locked.
 * LangGraph nodes call this before any LLM invoke / AI SDK `generateText` surface.
 */
export function instantiateBoardAgentModel(role: BoardModelRole): BoardModelHandle {
  const promptRole = PROMPT_ROLE_BY_MODEL[role];
  const vectorNamespace =
    role === "TRAINER" || role === "WRITER" ? resolveVectorNamespace(role) : null;

  return bindDeterministicGeneration({
    role,
    generation: DETERMINISTIC_GENERATION_PARAMS,
    systemPrompt: buildGroundedSystemPrompt(promptRole),
    vectorNamespace,
  });
}
