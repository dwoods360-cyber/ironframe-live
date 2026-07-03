/** Explicit abort reasons — never surface raw browser "signal is aborted without reason" to operators. */
export const ABORT_REASONS = {
  activeThreatsBoardSuperseded: "active-threats-board-superseded",
  dashboardFetchTimeout: "dashboard-fetch-timeout",
  integrityFetchTimeout: "integrity-fetch-timeout",
  inlineDocUnmount: "inline-doc-unmount",
  auditIntelUnmount: "audit-intel-unmount",
  ironsightPollTimeout: "ironsight-poll-timeout",
  ironsightCrawlTimeout: "ironsight-crawl-timeout",
  publicRegistrationTimeout: "public-registration-timeout",
  simulationNavSwitch: "simulation-nav-switch",
  dashboardNavCleanup: "dashboard-nav-cleanup",
} as const;

export type AbortReason = (typeof ABORT_REASONS)[keyof typeof ABORT_REASONS];
