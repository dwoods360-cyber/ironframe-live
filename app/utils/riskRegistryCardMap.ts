import type { RiskDeckCardItem } from "@/app/types/riskCard";
import type { RiskLifecycleStatus, RiskRegistryRecord } from "@/app/types/riskLifecycle";
import {
  extractRawAuditMarkdown,
  formatFrameworkLabelForCard,
  formatGovernedLiabilityForCard,
  parseIngestionDetailsObject,
} from "@/app/utils/riskCardEnrichment";

export function deltaLabelForLifecycle(status: RiskLifecycleStatus): string {
  switch (status) {
    case "INGESTED":
      return "Sensing…";
    case "REGISTERED":
      return "Baseline Logged";
    case "ACTIVE":
      return "Impacting maturity";
    case "RESOLVED":
      return "Forensic Closure";
  }
}

export function riskRegistryToDeckCard(record: RiskRegistryRecord): RiskDeckCardItem {
  const ingestion = parseIngestionDetailsObject(record.ingestionDetails);
  const markdownAuditBlock = extractRawAuditMarkdown(record.ingestionDetails);
  const financialCents =
    typeof ingestion.financialImpactCents === "string"
      ? ingestion.financialImpactCents
      : record.telemetryValue;
  const frameworkRaw =
    typeof ingestion.frameworkId === "string"
      ? ingestion.frameworkId
      : typeof ingestion.frameworkLabel === "string"
        ? ingestion.frameworkLabel
        : undefined;

  return {
    id: `registry-${record.id}`,
    processedData: {
      title: record.title,
      value: record.telemetryValue,
      delta: record.deltaLabel || deltaLabelForLifecycle(record.lifecycleStatus),
      status: record.lifecycleStatus,
      threatId: record.riskEventId ?? undefined,
      markdownAuditBlock,
      frameworkLabel: frameworkRaw ? formatFrameworkLabelForCard(frameworkRaw) : undefined,
      governedLiability: formatGovernedLiabilityForCard(financialCents),
    },
  };
}
