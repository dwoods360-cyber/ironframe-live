"use client";

import type { RiskDeckCardItem } from "@/app/types/riskCard";

export type GovernanceIngressProps = {
  cards?: RiskDeckCardItem[];
  registryIngressCards?: RiskDeckCardItem[];
  className?: string;
};

/**
 * @deprecated Epic-11 — RiskDeckGovernanceIngress retired from dashboard center pane.
 * Stage-1 Irongate ingress remains in audit logs and assignee history; use `GrcMaturityStrip`.
 */
export default function GovernanceIngress(_props: GovernanceIngressProps) {
  return null;
}
