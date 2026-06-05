import { CORE_WORKFORCE_AGENTS } from "@/app/config/agents";

/** How long an agent indicator stays in telemetry-active posture after a matching log line. */
export const AGENT_TELEMETRY_PULSE_MS = 2500;

const ROSTER_BY_UPPER = new Map(
  CORE_WORKFORCE_AGENTS.map((a) => [a.name.toUpperCase(), a.name] as const),
);

/** Forensic routing aliases → canonical roster name. */
const TELEMETRY_ALIASES: ReadonlyArray<[RegExp, string]> = [
  [/\[?IRONGATE\b|AGENT-14\b|IRONGATE_GATEWAY/, "Irongate"],
  [/\[?IRONLOCK\b|IRONLOCK INTERRUPT|IRONLOCK_AUTHORITY/, "Ironlock"],
  [/\bIRONCHAOS\b/, "Irontech"],
  [/\bIRONTECH\b/, "Irontech"],
  [/\bIRONSCRIBE\b/, "Ironscribe"],
  [/\bIRONTRUST\b/, "Irontrust"],
  [/\bIRONCAST\b/, "Ironcast"],
  [/\bIRONWAVE\b/, "Ironwave"],
  [/\bIRONGUARD\b/, "Ironguard"],
  [/\bIRONSIGHT\b/, "Ironsight"],
  [/\bIRONINTEL\b/, "Ironintel"],
  [/\bIRONWATCH\b/, "Ironwatch"],
  [/\bIRONCORE\b/, "Ironcore"],
  [/\bIRONLOGIC\b/, "Ironlogic"],
  [/\bIRONMAP\b/, "Ironmap"],
  [/\bIRONQUERY\b/, "Ironquery"],
  [/\bIRONSCOUT\b/, "Ironscout"],
  [/\bIRONBLOOM\b/, "Ironbloom"],
  [/\bIRONETHIC\b/, "Ironethic"],
  [/\bIRONTALLY\b/, "Irontally"],
];

/**
 * Parse canonical workforce agent names referenced in audit / DMZ telemetry text.
 * Matches roster tokens (IRONLOCK, IRONGATE, …) and forensic routing aliases.
 */
export function parseWorkforceAgentsFromTelemetryText(text: string): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  const u = trimmed.toUpperCase();
  const found = new Set<string>();

  for (const agent of CORE_WORKFORCE_AGENTS) {
    if (u.includes(agent.name.toUpperCase())) {
      found.add(agent.name);
    }
  }

  for (const [pattern, canonical] of TELEMETRY_ALIASES) {
    if (pattern.test(u)) {
      const name = ROSTER_BY_UPPER.get(canonical.toUpperCase()) ?? canonical;
      found.add(name);
    }
  }

  return Array.from(found);
}
