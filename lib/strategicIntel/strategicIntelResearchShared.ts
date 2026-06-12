/** Client-safe strategic intel types and formatters (no Prisma / server imports). */

export type IndustryProfileResearchContext = {
  manifestId: string;
  ingestedAt: string;
  industryKey: string;
  displayName: string;
  peerAleBaselineCents: string;
  regulatoryPressureIndex: number;
  saasDisruptionExposureIndex: number;
  continuousAuditPriority: string;
  narrativeSummary: string;
  sourceDocuments: string[];
  ragExcerpts: string[];
};

/** Format peer ALE cents as `$XM` label using integer arithmetic only. */
export function formatPeerAleMillionsFromCents(cents: string): string {
  const c = BigInt(cents);
  const millionsWhole = c / 100_000_000n;
  const tenth = (c % 100_000_000n) / 10_000_000n;
  return `${millionsWhole}.${tenth}M`;
}
