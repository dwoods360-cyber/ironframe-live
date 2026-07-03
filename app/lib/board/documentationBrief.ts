import "server-only";

import {
  DUAL_LOCATION_OUTPUT_MATRIX,
  DOCUMENTATION_CORPUS_PLANES,
  DOCUMENTATION_PLANE_APP_DOCS,
  DOCUMENTATION_PLANE_GOVERNANCE_BRIEFINGS,
  buildDualLocationOutputMatrixPromptBlock,
} from "@/lib/documentationCorpusPlanes";
import type { BoardContextPayload } from "@/app/lib/board/sharedBoardContext";
import {
  buildDocumentationFullAccessBundle,
  type DocumentationFullAccessBundle,
} from "@/app/lib/board/documentationCorpusIngress";
import {
  BOARD_MARKET_TRUTH_MANDATE,
  BOARD_LIVE_DISCOVERY_ONLY_MANDATE,
} from "@/app/lib/board/boardMarketTruthMandate";
import { loadTrainingCorpusPlacementTargets } from "@/app/lib/board/trainingCorpusPlacement";

/** One-way documentation handoff from Ironframe (:3000) to IronBoard Trainer / Writer agents. */
export type DocumentationCommunicationDirection = "ONE_WAY_IRONFRAME_TO_BOARD";

export type DocumentationAuthorAgentId = "board-trainer" | "board-writer";

export interface IronframeDocumentationBrief {
  communicationDirection: DocumentationCommunicationDirection;
  /** App docs vs governance briefings — separate reader surfaces, never cross-written. */
  corpusPlanes: {
    appDocs: {
      plane: typeof DOCUMENTATION_PLANE_APP_DOCS;
      readerRoute: string;
      authorAgents: ["board-trainer", "board-writer"];
    };
    governanceBriefings: {
      plane: typeof DOCUMENTATION_PLANE_GOVERNANCE_BRIEFINGS;
      readerRoute: string;
      draftPrefix: "briefing-queue/";
      publishedPrefix: "published-briefings/";
      authorAgents: string[];
    };
  };
  /** Serialized Dual-Location Output Matrix — boardroom must not conflate planes. */
  outputMatrix: {
    governanceBriefings: (typeof DUAL_LOCATION_OUTPUT_MATRIX)["GOVERNANCE_BRIEFINGS"];
    appDocs: (typeof DUAL_LOCATION_OUTPUT_MATRIX)["APP_DOCS"];
    promptBlock: string;
  };
  emittedAt: string;
  release: string;
  posture: string;
  authorAgents: {
    trainer: { id: "board-trainer"; role: "Trainer - Education Specialist" };
    writer: { id: "board-writer"; role: "Writer - Narrative Architect" };
  };
  /** Relative paths under docs/ — Trainer is responsible for Level 1 + training tracks. */
  trainerPlacementTargets: string[];
  /** Relative paths under docs/ — Writer is responsible for Level 2 technical corpus. */
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
  /** Full APP_DOCS corpus + route manifest + telemetry mirror for IronBoard Trainer/Writer (time-boxed PO review). */
  fullAccess: DocumentationFullAccessBundle;
  /** Live telemetry mirror — superset of platformFacts for grounded authoring. */
  telemetryMirror: {
    financials: BoardContextPayload["financials"];
    technical: BoardContextPayload["technical"];
    compliance: BoardContextPayload["compliance"];
    sustainability: BoardContextPayload["sustainability"];
    narrativeCache: BoardContextPayload["narrativeCache"];
  };
}

const RELEASE_TAG = "v0.1.0-ga-epic17";

const TRAINER_PLACEMENT_TARGETS = loadTrainingCorpusPlacementTargets().trainerPlacementTargets;

const WRITER_PLACEMENT_TARGETS = loadTrainingCorpusPlacementTargets().writerPlacementTargets;

const SOURCE_ANCHORS = [
  "docs/README.md",
  "docs/TAS.md",
  "config/route-manifest.v0.1.0-ga-epic17.json",
  "GET /api/board/shared-context",
] as const;

/**
 * Packages read-only platform facts for board Trainer / Writer agents.
 * Ironframe emits; IronBoard consumes — no write-back channel.
 */
export async function buildIronframeDocumentationBrief(
  payload: Omit<BoardContextPayload, "documentationBrief">,
): Promise<IronframeDocumentationBrief> {
  const registrationEnabled =
    process.env.IRONFRAME_PUBLIC_REGISTRATION_ENABLED?.trim().toLowerCase() === "true";

  const doraFramework = payload.compliance.frameworks.find((row) => row.name === "DORA");

  const trainerPlacementTargets = [...TRAINER_PLACEMENT_TARGETS];
  const writerPlacementTargets = [...WRITER_PLACEMENT_TARGETS];

  return {
    communicationDirection: "ONE_WAY_IRONFRAME_TO_BOARD",
    corpusPlanes: {
      appDocs: {
        plane: DOCUMENTATION_PLANE_APP_DOCS,
        readerRoute: DOCUMENTATION_CORPUS_PLANES.APP_DOCS.readerRoute,
        authorAgents: ["board-trainer", "board-writer"],
      },
      governanceBriefings: {
        plane: DOCUMENTATION_PLANE_GOVERNANCE_BRIEFINGS,
        readerRoute: DOCUMENTATION_CORPUS_PLANES.GOVERNANCE_BRIEFINGS.readerRoute,
        draftPrefix: "briefing-queue/",
        publishedPrefix: "published-briefings/",
        authorAgents: [...DOCUMENTATION_CORPUS_PLANES.GOVERNANCE_BRIEFINGS.authorAgents],
      },
    },
    outputMatrix: {
      governanceBriefings: DUAL_LOCATION_OUTPUT_MATRIX.GOVERNANCE_BRIEFINGS,
      appDocs: DUAL_LOCATION_OUTPUT_MATRIX.APP_DOCS,
      promptBlock: buildDualLocationOutputMatrixPromptBlock(),
    },
    emittedAt: payload.timestamp,
    release: RELEASE_TAG,
    posture: registrationEnabled ? "self-serve-registration" : "sales-assisted-pilot",
    authorAgents: {
      trainer: { id: "board-trainer", role: "Trainer - Education Specialist" },
      writer: { id: "board-writer", role: "Writer - Narrative Architect" },
    },
    trainerPlacementTargets,
    writerPlacementTargets,
    sourceAnchors: [...SOURCE_ANCHORS],
    platformFacts: {
      tenantId: payload.tenantId,
      timestamp: payload.timestamp,
      registrationEnabled,
      baselineTenantsCents: {
        medshield: payload.financials.baselines.medshield.toString(),
        vaultbank: payload.financials.baselines.vaultbank.toString(),
        gridcore: payload.financials.baselines.gridcore.toString(),
      },
      activeExposureFormatted:
        payload.financials.display.activeTenant.currentExposureFormatted,
      doraStatus: doraFramework?.status ?? "STAGED_DRAFT",
      criticalThreatCount: payload.technical.criticalThreatCount,
    },
    mandate:
      "Ironframe passes this brief one-way. board-trainer and board-writer author APP_DOCS only. " +
      `Prospect company names: live discovery only. ${BOARD_LIVE_DISCOVERY_ONLY_MANDATE} ${BOARD_MARKET_TRUTH_MANDATE}`,
    fullAccess: await buildDocumentationFullAccessBundle({
      trainerPlacementTargets,
      writerPlacementTargets,
    }),
    telemetryMirror: {
      financials: payload.financials,
      technical: payload.technical,
      compliance: payload.compliance,
      sustainability: payload.sustainability,
      narrativeCache: payload.narrativeCache,
    },
  };
}
