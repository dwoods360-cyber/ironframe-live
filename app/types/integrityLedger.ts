export type ServerIntegrityLedgerRow = {
  id: string;
  threatId: string;
  /** DB row title (may include ISO suffix for S5 snapshots). */
  title: string;
  /** SOC 2: canonical scenario label for auditors. */
  auditScenarioTitle: string;
  /** ISO instant for resolution (prefer `integrityResolvedAt` from ingestion). */
  recordedAt: string;
  timestampIso: string;
  authorizedUserId: string;
  authorizedDisplayName: string;
  eventType: string;
  scenario: string | null;
  recoverySeconds: number | null;
  lkgAttestationIroncoreSha256: string | null;
  frameworkBadges: string[];
};
