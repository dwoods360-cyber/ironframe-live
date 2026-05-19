import type { RiskDeckCardItem } from "@/app/types/riskCard";
import type { RiskLifecycleStatus, RiskRegistryRecord } from "@/app/types/riskLifecycle";

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
  return {
    id: `registry-${record.id}`,
    processedData: {
      title: record.title,
      value: record.telemetryValue,
      delta: record.deltaLabel || deltaLabelForLifecycle(record.lifecycleStatus),
      status: record.lifecycleStatus,
    },
  };
}
