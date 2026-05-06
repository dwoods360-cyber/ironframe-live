type ForensicReasoningLogShape = {
  version: number;
  agent5IronscribeCitation: { sourceDocumentHashSha256?: string; pageReference?: string };
  agent3IrontrustDeterministic: {
    formulaExplanation?: string;
    governedImpactCentsDecimal?: string;
  };
  ironwatchAgent13: { semanticDistance: number; vectorRecallScore: number };
};

export type ReasoningWaterfallVM = {
  ironscribe: { documentHash: string; pageRef: string; complete: boolean };
  irontrust: { governedImpactCents: string; formula?: string; complete: boolean };
  ironwatch: {
    shadowDissent: boolean;
    semanticDistance: number;
    vectorRecallScore: number;
    complete: boolean;
  };
};

/** Prefer immutable DB `forensic_seal` JSON when `ingestionDetails` was trimmed or volatile. */
function mergeImmutableSealIntoIngestionView(
  ingestionUnknown: unknown,
  immutableForensicSeal: unknown,
): Record<string, unknown> | null {
  if (
    immutableForensicSeal == null ||
    typeof immutableForensicSeal !== "object" ||
    Array.isArray(immutableForensicSeal)
  ) {
    return ingestionUnknown != null && typeof ingestionUnknown === "object" && !Array.isArray(ingestionUnknown)
      ? (ingestionUnknown as Record<string, unknown>)
      : null;
  }
  const seal = immutableForensicSeal as Record<string, unknown>;
  const base =
    ingestionUnknown != null && typeof ingestionUnknown === "object" && !Array.isArray(ingestionUnknown)
      ? ({ ...(ingestionUnknown as Record<string, unknown>) } as Record<string, unknown>)
      : ({} as Record<string, unknown>);
  base.forensicSeal = immutableForensicSeal;

  if (base.forensic_reasoning_log == null && seal.agentReasoning != null) {
    const ar = seal.agentReasoning as Record<string, unknown>;
    const ra = ar.regulatoryAnalysis as Record<string, unknown> | undefined;
    const diss = ar.dissentingOpinion as Record<string, unknown> | undefined;
    if (ra && diss) {
      base.forensic_reasoning_log = {
        version: 1,
        agent5IronscribeCitation: {
          sourceDocumentHashSha256: ra.sourceDocumentHashSha256,
          pageReference: ra.pageReference,
        },
        agent3IrontrustDeterministic: {
          formulaExplanation: undefined,
          governedImpactCentsDecimal: undefined,
        },
        ironwatchAgent13: {
          semanticDistance: typeof diss.semanticDistance === "number" ? diss.semanticDistance : 0,
          vectorRecallScore:
            typeof diss.hybridRetrievalScore === "number" ? diss.hybridRetrievalScore : 0,
        },
      };
    }
  }
  return base;
}

function readForensicLog(ingestion: Record<string, unknown>): ForensicReasoningLogShape | null {
  const raw = ingestion.forensic_reasoning_log ?? ingestion.forensicReasoningLog;
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  if (o.version !== 1) return null;
  const agent5 = o.agent5IronscribeCitation;
  const agent3 = o.agent3IrontrustDeterministic;
  const iw = o.ironwatchAgent13;
  if (
    agent5 == null ||
    typeof agent5 !== "object" ||
    agent3 == null ||
    typeof agent3 !== "object" ||
    iw == null ||
    typeof iw !== "object"
  ) {
    return null;
  }
  return raw as unknown as ForensicReasoningLogShape;
}

/**
 * Build the three-stage waterfall from shadow RiskEvent `ingestionDetails` JSON,
 * merged with immutable `forensic_seal` JSONB when present (DB golden copy).
 */
export function buildReasoningWaterfallFromIngestion(
  ingestionUnknown: unknown,
  immutableForensicSeal?: unknown,
): ReasoningWaterfallVM | null {
  const merged = mergeImmutableSealIntoIngestionView(ingestionUnknown, immutableForensicSeal ?? null);
  if (merged == null) return null;
  const ingestion = merged;
  const log = readForensicLog(ingestion);
  if (!log) return null;

  const hash = log.agent5IronscribeCitation.sourceDocumentHashSha256?.trim() ?? "";
  const page = log.agent5IronscribeCitation.pageReference?.trim() ?? "";
  const gov = log.agent3IrontrustDeterministic.governedImpactCentsDecimal?.trim() ?? "";
  const formula = log.agent3IrontrustDeterministic.formulaExplanation?.trim();

  const sentinel = ingestion.sentinelGrcInterview;
  let shadowDissent = false;
  if (sentinel != null && typeof sentinel === "object" && !Array.isArray(sentinel)) {
    const sd = (sentinel as Record<string, unknown>).shadowDissentActive;
    shadowDissent = sd === true;
  }
  const seal = ingestion.forensicSeal;
  if (!shadowDissent && seal != null && typeof seal === "object" && !Array.isArray(seal)) {
    shadowDissent = (seal as Record<string, unknown>).shadowDissentOverridden === true;
  }

  return {
    ironscribe: {
      documentHash: hash,
      pageRef: page,
      complete: hash.length === 64 && page.length > 0,
    },
    irontrust: {
      governedImpactCents: gov,
      formula: formula && formula.length > 0 ? formula : undefined,
      complete: gov.length > 0,
    },
    ironwatch: {
      shadowDissent,
      semanticDistance: log.ironwatchAgent13.semanticDistance,
      vectorRecallScore: log.ironwatchAgent13.vectorRecallScore,
      complete: true,
    },
  };
}
