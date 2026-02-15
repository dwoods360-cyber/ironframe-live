"use client";

export type WeeklySummaryMetrics = {
  archivedLowPriority: number;
  remediatedHighRisk: number;
};

const STORAGE_KEY = "weekly-grc-summary-v1";

const DEFAULT_METRICS: WeeklySummaryMetrics = {
  archivedLowPriority: 0,
  remediatedHighRisk: 0,
};

function readMetrics(): WeeklySummaryMetrics {
  if (typeof window === "undefined") {
    return DEFAULT_METRICS;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return DEFAULT_METRICS;
    }

    const parsed = JSON.parse(raw) as Partial<WeeklySummaryMetrics>;
    return {
      archivedLowPriority: parsed.archivedLowPriority ?? 0,
      remediatedHighRisk: parsed.remediatedHighRisk ?? 0,
    };
  } catch {
    return DEFAULT_METRICS;
  }
}

function writeMetrics(metrics: WeeklySummaryMetrics) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(metrics));
}

export function getWeeklySummaryMetrics() {
  return readMetrics();
}

export function incrementArchivedLowPriority(count: number) {
  if (count <= 0) {
    return readMetrics();
  }

  const current = readMetrics();
  const next = {
    ...current,
    archivedLowPriority: current.archivedLowPriority + count,
  };
  writeMetrics(next);
  return next;
}

export function incrementRemediatedHighRisk(count = 1) {
  if (count <= 0) {
    return readMetrics();
  }

  const current = readMetrics();
  const next = {
    ...current,
    remediatedHighRisk: current.remediatedHighRisk + count,
  };
  writeMetrics(next);
  return next;
}
