export type AlertType = "SOC_EMAIL" | "AGENT_ALERT" | "ANOMALY";

export type AlertOrigin = "SYSTEM" | "IRONSIGHT" | "SOC_INTAKE";

export type AlertSourceAgent = "IRONSIGHT" | "COREINTEL" | "COREGUARD" | "EXTERNAL SOC";

export type AlertDispatchMeta = {
  label: "[EXTERNAL SOC]" | "[AGENT ALERT]" | "[ANOMALY]";
  color: "purple" | "blue" | "yellow";
  badgeClass: string;
  borderClass: string;
  sourceTooltip: "Source: Internal AI Monitoring" | "Source: Verified SOC Email" | "Source: Heuristic Monitoring";
};

export type StreamAlert = {
  id: string;
  type: AlertType;
  origin: AlertOrigin;
  isExternalSOC: boolean;
  /** Matches Prisma ActiveRisk.source (String) */
  sourceAgent: AlertSourceAgent | string;
  title: string;
  impact: string;
  severityScore: number;
  liabilityUsd: number;
  status: "OPEN" | "APPROVED" | "DISMISSED";
  createdAt: string;
};

export function getAlertDispatchMeta(alert: Pick<StreamAlert, "type" | "origin" | "isExternalSOC">): AlertDispatchMeta {
  if (alert.type === "ANOMALY") {
    return {
      label: "[ANOMALY]",
      color: "yellow",
      badgeClass: "text-amber-300",
      borderClass: "border-amber-400/80 animate-pulse shadow-[0_0_18px_rgba(251,191,36,0.3)]",
      sourceTooltip: "Source: Heuristic Monitoring",
    };
  }

  const isExternalSOC = alert.origin === "SOC_INTAKE" && alert.type === "SOC_EMAIL" && alert.isExternalSOC;

  if (isExternalSOC) {
    return {
      label: "[EXTERNAL SOC]",
      color: "purple",
      badgeClass: "text-purple-300",
      borderClass: "border-purple-500/50 shadow-[0_0_18px_rgba(168,85,247,0.25)]",
      sourceTooltip: "Source: Verified SOC Email",
    };
  }

  return {
    label: "[AGENT ALERT]",
    color: "blue",
    badgeClass: "text-blue-300",
    borderClass: "border-blue-500/40",
    sourceTooltip: "Source: Internal AI Monitoring",
  };
}
