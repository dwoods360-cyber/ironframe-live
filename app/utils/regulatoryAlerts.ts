/**
 * Regulatory alert types and promotion logic for the REGULATORY ALERT banner.
 * Promotes sector/pipeline threats when liability > threshold or has a regulatory tag.
 */

import type { PipelineThreat } from "@/app/store/riskStore";

export type RegulatoryAlertPriority = "CRITICAL" | "HIGH";

export type RegulatoryAlert = {
  id: string;
  message: string;
  priority: RegulatoryAlertPriority;
  /** Liability in $M; used for sorting and display */
  liabilityM?: number;
  /** Impact score 0–100; used for sort when liabilityM not set */
  impact?: number;
};

export type PromotionOptions = {
  /** Promote when liability (score or loss) >= this value in $M. Default 20. */
  liabilityThresholdM?: number;
  /** Promote when signal name/id contains any of these tags (case-insensitive). */
  regulatoryTags?: string[];
};

const DEFAULT_LIABILITY_THRESHOLD_M = 20;
const DEFAULT_REGULATORY_TAGS = ["zero-day", "ZERO-DAY", "ZERO DAY", "mandatory filing", "MANDATORY FILING"];

function hasRegulatoryTag(nameOrId: string, tags: string[]): boolean {
  const lower = (nameOrId ?? "").toLowerCase();
  return tags.some((tag) => lower.includes(tag.toLowerCase()));
}

/**
 * Promote a signal to a regulatory alert if:
 * - Liability exceeds the specified threshold (default $20M), OR
 * - Name or id contains any of the regulatory tags (e.g. Zero-Day, Mandatory Filing).
 */
export function shouldPromoteToRegulatoryAlert(
  threat: PipelineThreat,
  options: PromotionOptions = {}
): boolean {
  const threshold = options.liabilityThresholdM ?? DEFAULT_LIABILITY_THRESHOLD_M;
  const tags = options.regulatoryTags ?? DEFAULT_REGULATORY_TAGS;
  const liabilityM = threat.score ?? threat.loss;
  if (liabilityM >= threshold) return true;
  if (hasRegulatoryTag(threat.name ?? "", tags) || hasRegulatoryTag(threat.id ?? "", tags)) return true;
  return false;
}

/**
 * Build a regulatory alert from a pipeline/sector threat that meets promotion criteria.
 */
export function promoteThreatToAlert(
  threat: PipelineThreat,
  options: PromotionOptions = {}
): RegulatoryAlert {
  const threshold = options.liabilityThresholdM ?? DEFAULT_LIABILITY_THRESHOLD_M;
  const liabilityM = threat.score ?? threat.loss;
  const isCritical = liabilityM >= threshold || hasRegulatoryTag(threat.name ?? "", ["zero-day", "zero day"]) || hasRegulatoryTag(threat.id ?? "", ["zero-day"]);
  const priority: RegulatoryAlertPriority = isCritical ? "CRITICAL" : "HIGH";
  const tags: string[] = [];
  if (hasRegulatoryTag(threat.name ?? "", ["zero-day"]) || hasRegulatoryTag(threat.id ?? "", ["zero-day"])) tags.push("Zero-Day");
  if (hasRegulatoryTag(threat.name ?? "", ["mandatory filing"])) tags.push("Mandatory Filing");
  const tagStr = tags.length > 0 ? ` [${tags.join(", ")}]` : "";
  const message = `${threat.name} — $${liabilityM.toFixed(1)}M${tagStr}`;
  return { id: `reg-${threat.id}`, message, priority, liabilityM };
}

/**
 * Combine pipeline and active threats, filter by promotion rule, and return alerts
 * sorted by highest liability/impact first (then CRITICAL before HIGH).
 */
export function getPromotedAlertsFromThreats(
  threats: PipelineThreat[],
  options: PromotionOptions = {}
): RegulatoryAlert[] {
  const promoted = threats
    .filter((t) => shouldPromoteToRegulatoryAlert(t, options))
    .map((t) => promoteThreatToAlert(t, options));
  return sortAlertsByPriorityAndImpact(promoted);
}

/**
 * Sort alerts by highest liability/impact first, then by priority (CRITICAL > HIGH).
 */
export function sortAlertsByPriorityAndImpact(alerts: RegulatoryAlert[]): RegulatoryAlert[] {
  return [...alerts].sort((a, b) => {
    const liabilityA = a.liabilityM ?? a.impact ?? 0;
    const liabilityB = b.liabilityM ?? b.impact ?? 0;
    if (liabilityB !== liabilityA) return liabilityB - liabilityA;
    const order = { CRITICAL: 0, HIGH: 1 };
    return order[a.priority] - order[b.priority];
  });
}

/**
 * Convert server ticker strings into HIGH-priority alerts.
 */
export function tickerStringsToAlerts(ticker: string[]): RegulatoryAlert[] {
  return ticker.map((message, i) => ({
    id: `ticker-${i}-${message.slice(0, 20).replace(/\s/g, "-")}`,
    message,
    priority: "HIGH" as const,
  }));
}
