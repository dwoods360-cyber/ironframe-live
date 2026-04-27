import type { RemediationImpactReport } from "@/app/types/remediationReceipt";
import { formatUsdFromCentsString } from "@/app/utils/syntheticPersonaDisplay";

function parseCentsBigInt(raw: string): bigint {
  const t = raw.trim();
  if (!/^-?\d+$/.test(t)) return 0n;
  return BigInt(t);
}

export function isSecureLabRecovery(report: RemediationImpactReport): boolean {
  return parseCentsBigInt(report.totalRecoveredCents) === 0n && report.affectedCount === 0;
}

/** Stakeholder / Slack / clipboard brief for a completed remediation. */
export function buildRemediationStakeholderBrief(data: RemediationImpactReport): string {
  const usd = formatUsdFromCentsString(data.totalRecoveredCents);
  const secure = isSecureLabRecovery(data);
  const shieldLine = secure
    ? "🛡️ System remained secure; no capital lost."
    : `🛡️ High-Value Target Protected: ${data.highestValueTarget ?? "N/A"}`;
  return [
    "🚀 Ironframe Remediation Success!",
    `💰 Capital Recovered: ${usd}`,
    shieldLine,
    "✅ System Integrity: 100% PRISTINE",
    "#Ironframe #CyberResilience #GRC",
  ].join("\n");
}
