import type { IronframeDocumentationBrief } from "../src/types/ironframeDocumentationBrief.js";

/** Sample brief for in-memory LangGraph tests (mirrors Ironframe shared-context shape). */
export function sampleIronframeDocumentationBrief(): IronframeDocumentationBrief {
  return {
    communicationDirection: "ONE_WAY_IRONFRAME_TO_BOARD",
    emittedAt: "2026-06-17T12:00:00.000Z",
    release: "v0.1.0-ga-epic17",
    posture: "sales-assisted-pilot",
    authorAgents: {
      trainer: { id: "board-trainer", role: "Trainer - Education Specialist" },
      writer: { id: "board-writer", role: "Writer - Narrative Architect" },
    },
    trainerPlacementTargets: [
      "user-manuals/quickstart.md",
      "user-manuals/dashboard-guide.md",
      "user-manuals/glossary.md",
      "training/LEVEL1-STUDENT-INDEX.md",
    ],
    writerPlacementTargets: [
      "technical/architecture-and-api.md",
      "technical/deployment-and-ops.md",
    ],
    sourceAnchors: ["docs/README.md", "GET /api/board/shared-context"],
    platformFacts: {
      tenantId: "5c420f5a-8f1f-4bbf-b42d-7f8dd4bb6a01",
      timestamp: "2026-06-17T12:00:00.000Z",
      registrationEnabled: false,
      baselineTenantsCents: {
        medshield: "1110000000",
        vaultbank: "590000000",
        gridcore: "470000000",
      },
      activeExposureFormatted: "$11.1M USD",
      doraStatus: "COMPLIANT",
      criticalThreatCount: 0,
    },
    mandate: "Ironframe passes this brief one-way. No write-back.",
    fullAccess: {
      enabled: true,
      reviewNote: "Full documentation ingress enabled for IronBoard board-trainer and board-writer.",
      providingAgents: [
        {
          agentId: "03",
          ironframeName: "Irontrust",
          supplies: "BigInt ALE baselines, tenant exposure cents",
        },
        {
          agentId: "19",
          ironframeName: "Irontally",
          supplies: "Framework readiness percentages",
        },
      ],
      corpusPlanePrefixes: ["user-manuals/", "training/", "technical/"],
      routeManifest: { routes: [{ path: "/integrity" }] },
      featureGlossaryExcerpt: "## Feature glossary excerpt\n\nSample glossary row.",
      tasExcerpt: "## TAS excerpt\n\nSample TAS row.",
      documents: [
        {
          slug: "user-manuals/quickstart",
          title: "Quickstart",
          readingLevel: "LEVEL_1",
          content: "# Existing quickstart",
          updatedAt: "2026-06-17T12:00:00.000Z",
          truncated: false,
        },
      ],
    },
    telemetryMirror: {
      financials: {
        baselines: { medshield: "1110000000", vaultbank: "590000000", gridcore: "470000000" },
        currentExposureCents: "1110000000",
        display: {},
      },
      technical: { criticalThreatCount: 0, activeVulnerabilities: [] },
      compliance: {
        frameworks: [{ name: "DORA", status: "COMPLIANT", completionPercentage: 100 }],
      },
      sustainability: { powerUsageKwh: "15000", fluidConsumptionLiters: "3200" },
      narrativeCache: null,
    },
  };
}
