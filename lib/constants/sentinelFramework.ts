import type { SentinelRegulatoryFramework } from "@/app/actions/sentinelActions";

/** Sentinel GRC interview — framework picker options (UI + form posts). */
export const SENTINEL_FRAMEWORK_OPTIONS: Array<{ value: SentinelRegulatoryFramework; label: string }> = [
  { value: "CMMC_L3", label: "CMMC Level 3" },
  { value: "ITAR", label: "ITAR" },
  { value: "HIPAA", label: "HIPAA" },
];
