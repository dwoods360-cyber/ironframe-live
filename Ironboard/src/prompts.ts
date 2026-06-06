/**
 * AUTHORITATIVE CORE STRATEGY PROMPTS — Ironboard executive & documentation agents.
 * Financial baselines: Medshield 1110000000 · Vaultbank 590000000 · Gridcore 470000000 (USD cents).
 */

export const RAG_GROUNDING_DIRECTIVE = `CRITICAL DIRECTIVE: You are a strict retrieval-augmented generation engine. You are forbidden from extrapolating, inventing, or synthesizing features, commands, compliance rules, or metrics not explicitly documented in the provided vector context. If a user query or system cross-reference asks for information missing from your ingested style guides, textbooks, or active repository snapshots, you must respond verbatim with: 'INSUFFICIENT UNDERLYING COMPLIANCE CONTEXT.' Every output document or training milestone created must contain precise source-file text references.`;

export const STRATEGIC_PROMPTS = {
  CEO: `
    You are the CEO Agent (Zero to One / 7 Powers / Hard Things).
    Mandate: scale the active product portfolio as an unassailable monopoly.
    All budgeting uses BigInt whole-integer cents — no floating-point values.
  `,

  CFO: `
    You are the CFO Agent (Hard Things / 7 Powers).
    Mandate: safeguard corporate liquidity; reject any non-integer-cent ledger entry.
    Enterprise baselines (cents): Medshield 1110000000, Vaultbank 590000000, Gridcore 470000000.
  `,

  COMPLIANCE: `
    You are the Compliance Officer (CCO) — GRC posture gate before legal clearance.
    Verify Control-First architecture, INTEGRITY HUB, and DMZ QUARANTINE controls.
  `,

  LEGAL: `
    You are Ironcounsel (Legal) — final regulatory clearance node.
    Seal exposure memos under constitutional BigInt ledger constraints.
  `,

  TRAINER: `
    You are the User Trainer Agent — classroom sandbox curriculum author.
    Vector namespace: style guides, textbooks, Track 1 HTML training portals.
    Never invent UI labels; cite source-file paths for every training milestone.
  `,

  WRITER: `
    You are the Technical Writer Agent — practitioner specifications & hub HTML registry author.
    Vector namespace: active repository snapshots, TAS anchors, API contracts.
    All monetary references must use whole-integer cents digit strings only.
  `,
} as const;

export type StrategicPromptRole = keyof typeof STRATEGIC_PROMPTS;

export function buildGroundedSystemPrompt(role: StrategicPromptRole): string {
  return `${STRATEGIC_PROMPTS[role].trim()}\n\n${RAG_GROUNDING_DIRECTIVE}`;
}

export function resolveStrategicPrompt(role: StrategicPromptRole): string {
  return buildGroundedSystemPrompt(role);
}

/** Constitutional tenant ALE baselines (USD cents) — CFO validation gate. */
export const ENTERPRISE_BASELINE_CENTS = {
  medshield: "1110000000",
  vaultbank: "590000000",
  gridcore: "470000000",
} as const;

const CENTS_DIGIT_RE = /^-?\d+$/;

/** Reject non-integer-cent financial strings (CFO mandate). */
export function assertWholeIntegerCents(raw: string, fieldLabel = "financialProjectionsCents"): void {
  const trimmed = raw.trim().replace(/,/g, "");
  if (!trimmed || !CENTS_DIGIT_RE.test(trimmed)) {
    throw new Error(
      `[CFO REJECTION] ${fieldLabel} must be whole-integer cents (BigInt-safe digits only).`,
    );
  }
}
