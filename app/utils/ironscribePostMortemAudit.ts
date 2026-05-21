/**
 * Client-safe parse of Ironscribe sealed post-mortem audit rows (`IRONSCRIBE_POST_MORTEM_STALE_DATA_OUTAGE`).
 */
export type IronscribePostMortemAuditFlags = {
  resilienceGapDetected: boolean;
  chronicFailureEpisodes30d: number | null;
};

export function parseIronscribePostMortemAuditFlags(
  justification: string | null | undefined,
): IronscribePostMortemAuditFlags {
  if (!justification?.trim()) {
    return { resilienceGapDetected: false, chronicFailureEpisodes30d: null };
  }
  try {
    const j = JSON.parse(justification) as {
      preventativeDirectiveSuggested?: unknown;
      chronicFailureEpisodes30d?: unknown;
    };
    const episodes =
      typeof j.chronicFailureEpisodes30d === "number" && Number.isFinite(j.chronicFailureEpisodes30d)
        ? j.chronicFailureEpisodes30d
        : null;
    return {
      resilienceGapDetected: j.preventativeDirectiveSuggested === true,
      chronicFailureEpisodes30d: episodes,
    };
  } catch {
    return { resilienceGapDetected: false, chronicFailureEpisodes30d: null };
  }
}
