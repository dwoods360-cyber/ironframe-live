/** Parsed from Ironframe GET /api/board/shared-context → documentationBrief. */
export type DocumentationCommunicationDirection = "ONE_WAY_IRONFRAME_TO_BOARD";

export type DocumentationProvidingAgent = {
  agentId: string;
  ironframeName: string;
  supplies: string;
};

export type DocumentationCorpusBriefDocument = {
  slug: string;
  title: string;
  readingLevel: string;
  content: string;
  updatedAt: string;
  truncated: boolean;
};

export type DocumentationFullAccessBundle = {
  enabled: true;
  reviewNote: string;
  providingAgents: DocumentationProvidingAgent[];
  corpusPlanePrefixes: readonly string[];
  routeManifest: unknown | null;
  featureGlossaryExcerpt: string;
  tasExcerpt: string;
  documents: DocumentationCorpusBriefDocument[];
};

export type DocumentationTelemetryMirror = {
  financials: {
    baselines: { medshield: bigint | string; vaultbank: bigint | string; gridcore: bigint | string };
    currentExposureCents: bigint | string;
    display: unknown;
  };
  technical: {
    criticalThreatCount: number;
    activeVulnerabilities: Array<{
      id: string;
      cveId: string | null;
      description: string;
      blastRadiusCents: bigint | string;
    }>;
  };
  compliance: {
    frameworks: Array<{
      name: string;
      status: string;
      completionPercentage: number;
    }>;
  };
  sustainability: {
    powerUsageKwh: bigint | string;
    fluidConsumptionLiters: bigint | string;
  };
  narrativeCache: {
    operationalDate: string;
    exposureVector: string;
    impactSummary: string;
    remediation: string;
    narrativeMarkdown: string;
  } | null;
};

export interface IronframeDocumentationBrief {
  communicationDirection: DocumentationCommunicationDirection;
  corpusPlanes?: {
    appDocs: {
      plane: "APP_DOCS";
      readerRoute: string;
      authorAgents: ["board-trainer", "board-writer"];
    };
    governanceBriefings: {
      plane: "GOVERNANCE_BRIEFINGS";
      readerRoute: string;
      draftPrefix: string;
      publishedPrefix: string;
      authorAgents: string[];
    };
  };
  emittedAt: string;
  release: string;
  posture: string;
  authorAgents: {
    trainer: { id: "board-trainer"; role: string };
    writer: { id: "board-writer"; role: string };
  };
  trainerPlacementTargets: string[];
  writerPlacementTargets: string[];
  sourceAnchors: string[];
  platformFacts: {
    tenantId: string;
    timestamp: string;
    registrationEnabled: boolean;
    baselineTenantsCents: {
      medshield: string;
      vaultbank: string;
      gridcore: string;
    };
    activeExposureFormatted: string;
    doraStatus: string;
    criticalThreatCount: number;
  };
  mandate: string;
  fullAccess?: DocumentationFullAccessBundle;
  telemetryMirror?: DocumentationTelemetryMirror;
}

export function resolveCorpusDocument(
  brief: IronframeDocumentationBrief,
  slugInput: string,
): DocumentationCorpusBriefDocument | null {
  const bundle = brief.fullAccess;
  if (!bundle?.enabled) return null;
  const normalized = slugInput
    .trim()
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .replace(/\.md$/i, "")
    .toLowerCase();
  return bundle.documents.find((doc) => doc.slug.toLowerCase() === normalized) ?? null;
}

export function isIronframeDocumentationBrief(value: unknown): value is IronframeDocumentationBrief {
  if (!value || typeof value !== "object") return false;
  const brief = value as IronframeDocumentationBrief;
  return (
    brief.communicationDirection === "ONE_WAY_IRONFRAME_TO_BOARD" &&
    Array.isArray(brief.trainerPlacementTargets) &&
    Array.isArray(brief.writerPlacementTargets) &&
    typeof brief.mandate === "string"
  );
}
