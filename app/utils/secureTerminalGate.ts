import { formatAgentIntelLine } from "@/app/utils/intelligenceStreamFormat";
import { containsIngressShellEscapeVector } from "@/app/utils/ingressEscapeNeutralizer";

/** Irongate DMZ gate — max raw terminal payload length (chars). */
export const TERMINAL_INPUT_MAX_LENGTH = 48;

/** Macros that require an active tenant session before client execution. */
export const TENANT_BOUND_TERMINAL_MACROS = new Set([
  "kimbot",
  "kimbotx",
  "grcbot",
  "grcbotx",
]);

export const ALLOWED_TERMINAL_MACROS = new Set([
  "kimbot",
  "kimbotx",
  "grcbot",
  "grcbotx",
  "purg",
]);

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type SecureTerminalParseResult =
  | { ok: true; cmd: string; grcCompanyCount: number | null }
  | { ok: false; reason: "empty" | "length" | "escape" | "malformed" | "unauthorized" };

export function isVerifiedActiveTenantUuid(tenantUuid: string | null | undefined): boolean {
  const t = tenantUuid?.trim() ?? "";
  return t.length > 0 && UUID_RE.test(t);
}

export function formatIrongateTerminalRejection(detail: string, at?: Date): string {
  return formatAgentIntelLine("AGENT-14", "IRONGATE", `[REJECTED] ${detail}`, at);
}

export const IRONGATE_MALFORMED_REJECTION = formatIrongateTerminalRejection(
  "Unauthorized or malformed terminal macro payload.",
);

export function formatTenantIsolationFault(at?: Date): string {
  return formatIrongateTerminalRejection(
    "Tenant isolation fault — no active session tenant bound.",
    at,
  );
}

/**
 * Agent 14 gate: length, shell-meta neutralization, whitelist-only macro tokens.
 */
export function parseSecureTerminalMacro(raw: string): SecureTerminalParseResult {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: false, reason: "empty" };
  if (trimmed.length > TERMINAL_INPUT_MAX_LENGTH) return { ok: false, reason: "length" };
  if (containsIngressShellEscapeVector(trimmed)) return { ok: false, reason: "escape" };

  const normalized = trimmed.toLowerCase().replace(/\s+/g, " ");
  const parts = normalized.split(" ").filter(Boolean);
  if (parts.length === 0) return { ok: false, reason: "empty" };
  if (parts.length > 2) return { ok: false, reason: "malformed" };

  const cmd = parts[0]!;
  if (!/^[a-z][a-z0-9]{0,15}$/.test(cmd)) return { ok: false, reason: "malformed" };
  if (!ALLOWED_TERMINAL_MACROS.has(cmd)) return { ok: false, reason: "unauthorized" };

  if (cmd === "grcbot") {
    if (parts.length === 1) {
      return { ok: true, cmd, grcCompanyCount: 1 };
    }
    const value = parts[1]!;
    if (!/^\d{1,3}$/.test(value)) return { ok: false, reason: "malformed" };
    const n = Number.parseInt(value, 10);
    if (!Number.isFinite(n) || n < 1 || n > 100) return { ok: false, reason: "malformed" };
    return { ok: true, cmd, grcCompanyCount: n };
  }

  if (parts.length > 1) return { ok: false, reason: "malformed" };

  return { ok: true, cmd, grcCompanyCount: null };
}

export function macroRequiresTenant(cmd: string): boolean {
  return TENANT_BOUND_TERMINAL_MACROS.has(cmd);
}
