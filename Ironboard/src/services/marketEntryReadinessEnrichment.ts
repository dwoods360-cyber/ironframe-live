export type ParsedMarketEntryReadiness = {
  goldenPathConsecutivePasses: number;
  currentRunId: string | null;
  lastExecutedStop: string | null;
  gateBlockers: string[];
  activeScopeFreeze: boolean;
  registrationPosture: 'sales-assisted-pilot' | 'self-serve-registration';
  ingestedLiveProspectsCount: number;
};

export function parseMarketEntryReadinessFromTelemetry(
  telemetryJson: string,
): ParsedMarketEntryReadiness | null {
  try {
    const payload = JSON.parse(telemetryJson) as { marketEntryReadiness?: ParsedMarketEntryReadiness };
    const block = payload.marketEntryReadiness;
    if (!block || typeof block !== 'object') return null;
    if (typeof block.goldenPathConsecutivePasses !== 'number') return null;
    return {
      goldenPathConsecutivePasses: block.goldenPathConsecutivePasses,
      currentRunId: block.currentRunId ?? null,
      lastExecutedStop: block.lastExecutedStop ?? null,
      gateBlockers: Array.isArray(block.gateBlockers) ? block.gateBlockers.map(String) : [],
      activeScopeFreeze: block.activeScopeFreeze === true,
      registrationPosture:
        block.registrationPosture === 'self-serve-registration'
          ? 'self-serve-registration'
          : 'sales-assisted-pilot',
      ingestedLiveProspectsCount: Number(block.ingestedLiveProspectsCount ?? 0),
    };
  } catch {
    return null;
  }
}

export function formatMarketEntryReadinessEnrichment(
  readiness: ParsedMarketEntryReadiness | null,
): string {
  if (!readiness) {
    return [
      'MARKET ENTRY READINESS (GET /api/board/shared-context): block missing — do not infer Golden Path stage.',
      'State that certification telemetry is unavailable; refuse outbound scaling advice.',
    ].join(' ');
  }

  const lines = [
    'MARKET ENTRY READINESS — ENGINEERING LEDGER (authoritative; cite JSON path marketEntryReadiness.*)',
    `goldenPathConsecutivePasses: ${readiness.goldenPathConsecutivePasses} (pass bar = 3 consecutive)`,
    `currentRunId: ${readiness.currentRunId ?? 'none'}`,
    `lastExecutedStop: ${readiness.lastExecutedStop ?? 'none'}`,
    `gateBlockers: ${readiness.gateBlockers.length ? readiness.gateBlockers.join(', ') : 'none'}`,
    `activeScopeFreeze: ${readiness.activeScopeFreeze}`,
    `registrationPosture: ${readiness.registrationPosture}`,
    `ingestedLiveProspectsCount: ${readiness.ingestedLiveProspectsCount}`,
    '',
    'PERSONA GATING (condition GTM advice on the ledger — never guess):',
  ];

  const passes = readiness.goldenPathConsecutivePasses;
  if (passes < 3) {
    lines.push(
      `- Product Manager / board-pm: Halt outbound sequence scaling. Airworthiness bar not met (${passes}/3). Focus on gateBlockers until cleared.`,
    );
  }
  if (passes === 2) {
    lines.push(
      '- CFO / board-cfo: Maintain scope freeze. Live discovery is narrative preparation only — defer commercial contracting until final verification flight passes.',
    );
  }
  if (passes >= 3 && readiness.gateBlockers.length === 0) {
    lines.push(
      '- Sales Leader / board-sales-lead: Airworthiness certified. Phase B outreach cleared — cite ONLY LIVE_CANDIDATE rows from workspace snapshot.',
    );
  }
  if (readiness.gateBlockers.includes('BILLING_STATUS_PENDING')) {
    lines.push(
      '- Engineering focus: setTenantBillingStatusAction ACTIVE before Stop 5 export gate (see gateBlockers).',
    );
  }

  lines.push(
    'Forbidden: citing Webster Financial, Austin Energy, Zions, SMUD, or any prospect name not in market_prospects this session.',
  );

  return lines.join('\n');
}
