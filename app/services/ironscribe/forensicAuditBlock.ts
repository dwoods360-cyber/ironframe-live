import type { ForensicHistoryEntry } from "@/src/services/orchestration/forensicState";

export type IronscribeForensicAuditInput = {
  threatId: string;
  tenantId: string;
  financialImpactCents: string;
  historyLogs: ForensicHistoryEntry[];
  complianceBadges: string[];
  auditTimestamp?: string;
};

/** BigInt-safe USD display from sealed cents string (no float on money path). */
export function formatUsdFromSealedCents(centsStr: string): string {
  const cents = BigInt(centsStr || "0");
  const negative = cents < 0n;
  const abs = negative ? -cents : cents;
  const dollars = abs / 100n;
  const remainder = (abs % 100n).toString().padStart(2, "0");
  return `${negative ? "-" : ""}${dollars}.${remainder}`;
}

/**
 * Ironscribe (Agent 5) — immutable markdown forensic evidence block before DB write.
 */
export function buildIronscribeForensicAuditMarkdown(
  input: IronscribeForensicAuditInput,
): string {
  const auditTimestamp = input.auditTimestamp ?? new Date().toISOString();
  const usdLabel = formatUsdFromSealedCents(input.financialImpactCents);
  const sealedCents = input.financialImpactCents || "0";

  const custodySection = input.historyLogs
    .map((log, index) => {
      return `${index + 1}. **${log.agentId}** at *${log.timestamp}*\n   - *Action:* ${log.message}`;
    })
    .join("\n");

  const complianceSection =
    input.complianceBadges.length > 0
      ? input.complianceBadges
          .map((badge) => `- [x] **Enforced Standard:** ${badge}`)
          .join("\n")
      : `- [x] **Enforced Standard:** Baseline Structural Integrity Guard`;

  return [
    `# FORENSIC AUDIT TRAIL — SYSTEM INTEGRITY DISCLOSURE`,
    `**Threat ID:** \`${input.threatId}\`  `,
    `**Tenant ID:** \`${input.tenantId}\`  `,
    `**Timestamp:** \`${auditTimestamp}\`  `,
    `**Financial Valuation:** \`$${usdLabel}\` (Sealed BigInt Cents: \`${sealedCents}\`)`,
    `\n## FORCE-WIDE CHAIN OF CUSTODY LOGS`,
    custodySection,
    `\n## REGULATORY COMPLIANCE VALIDATION`,
    complianceSection,
    `\n---`,
    `*Generated Autonomously by Ironscribe (Agent 5) · Registration & Policy Mapping Core.*`,
  ].join("\n");
}
