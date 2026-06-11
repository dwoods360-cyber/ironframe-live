import { formatIntelStreamLine } from "@/app/utils/intelligenceStreamFormat";
import {
  containsIngressShellEscapeVector,
  neutralizeIngressShellMetachars,
} from "@/app/utils/ingressEscapeNeutralizer";

export const SENTINEL_INSTRUCTION_MAX_LENGTH = 256;

export type SentinelInstructionParseResult =
  | { ok: true; sanitized: string }
  | { ok: false; reason: "empty" | "length" | "escape" };

export function sanitizeSentinelInstructionInput(raw: string): string {
  const capped = raw.slice(0, SENTINEL_INSTRUCTION_MAX_LENGTH);
  return neutralizeIngressShellMetachars(capped);
}

export function parseSentinelAgentInstruction(raw: string): SentinelInstructionParseResult {
  const sanitized = sanitizeSentinelInstructionInput(raw);
  if (!sanitized) return { ok: false, reason: "empty" };
  if (raw.trim().length > SENTINEL_INSTRUCTION_MAX_LENGTH) return { ok: false, reason: "length" };
  if (containsIngressShellEscapeVector(raw)) return { ok: false, reason: "escape" };
  return { ok: true, sanitized };
}

export function formatSentinelSweepInitiatedLine(at?: Date): string {
  return formatIntelStreamLine(
    "[SYSTEM] Sentinel Sweep initiated via manual macro instruction.",
    at,
  );
}
