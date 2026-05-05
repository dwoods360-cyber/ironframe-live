import type { Prisma } from "@prisma/client";

/** True when this log row records control-framework mapping (compliance velocity clock stop). */
export function reasoningLogIndicatesControlMapped(log: {
  plan: Prisma.JsonValue;
  escalationLogic: string | null;
  reasoning: string;
  agentName: string;
}): boolean {
  const el = (log.escalationLogic ?? "").toUpperCase();
  if (el.includes("CONTROL_FRAMEWORK_MAPPING") || el.includes("CONTROL_MAP")) return true;
  const p = log.plan;
  if (p && typeof p === "object" && !Array.isArray(p)) {
    const o = p as Record<string, unknown>;
    if (o.controlMappingRecorded === true) return true;
    if (Array.isArray(o.mappedControls) && o.mappedControls.length > 0) return true;
  }
  const r = (log.reasoning ?? "").toUpperCase();
  if (r.includes("FRAMEWORK CONTROL MAPPING") || r.includes("CONTROL MAPPING:")) return true;
  if (log.agentName === "Irontally" && el.includes("MAPPING")) return true;
  return false;
}
