import "server-only";

/**
 * TAS §3 — Ironbloom (Agent 18) Gridcore regional carbon coefficient poll.
 * Canonical entry for cron and host-level orchestrators (`executeGridcoreRatePoll`).
 */
export {
  executeGridcoreCarbonLedgerSync,
  executeGridcoreRatePoll,
  fetchRenewableSharePercent,
  type GridcoreCarbonLedgerSyncResult,
} from "@/app/services/ironbloom/gridcoreCarbonLedgerSync";
