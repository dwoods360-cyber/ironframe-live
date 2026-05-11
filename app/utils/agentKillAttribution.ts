import { CORE_WORKFORCE_AGENTS } from "@/app/config/agents";
import type { PipelineThreat } from "@/app/store/riskStore";

export type WorkforceAgentCanonicalName = (typeof CORE_WORKFORCE_AGENTS)[number]["name"];

const ROSTER_NAMES = CORE_WORKFORCE_AGENTS.map((a) => a.name);

/**
 * Maps a resolved threat + operator display string to one of the 19 constitutional workforce agents.
 * Simulation bots default to Ironlock (Kim), Ironguard (GRC), Irongate (attack ingress), Irontech (chaos).
 */
export function inferAgentKillAttribution(
  threat: Pick<PipelineThreat, "name" | "source"> | null | undefined,
  operatorDisplayName?: string | null,
): WorkforceAgentCanonicalName {
  const src = (threat?.source ?? "").trim();
  const title = (threat?.name ?? "").trim();
  const haystack = `${operatorDisplayName ?? ""} ${title} ${src}`.toUpperCase();

  for (const name of ROSTER_NAMES) {
    if (haystack.includes(name.toUpperCase())) {
      return name;
    }
  }

  const uTitle = title.toUpperCase();
  const uSrc = src.toUpperCase();

  if (uTitle.includes("KIMBOT") || uSrc.includes("KIMBOT")) return "Ironlock";
  if (uTitle.includes("[GRC]") || uSrc.includes("GRC_BOT")) return "Ironguard";
  if (uTitle.includes("[ATTACK]") || uSrc.includes("ATTACK_BOT") || uSrc.includes("ATTBOT")) return "Irongate";
  if (/CHAOS_|IRONCHAOS/.test(uTitle + uSrc)) return "Irontech";
  if (uSrc.includes("INFIL")) return "Ironscout";
  if (uSrc.includes("PHISH")) return "Ironsight";

  return "Irontech";
}
