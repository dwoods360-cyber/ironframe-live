import { describe, expect, it, vi } from "vitest";

import { buildIronframeDocumentationBrief } from "@/app/lib/board/documentationBrief";
import { DOCUMENTATION_PROVIDING_AGENTS } from "@/app/lib/board/documentationCorpusIngress";
import { buildBoardFinancialDisplay } from "@/app/lib/board/boardFinancialDisplay";
import {
  BOARD_ALE_BASELINES_CENTS,
  type BoardContextPayload,
} from "@/app/lib/board/sharedBoardContext";

vi.mock("@/lib/prisma", () => ({
  default: {
    appDocument: {
      findMany: vi.fn().mockResolvedValue([
        {
          slug: "user-manuals/quickstart",
          title: "Quickstart",
          readingLevel: "LEVEL_1",
          content: "# Existing quickstart corpus",
          updatedAt: new Date("2026-06-17T12:00:00.000Z"),
        },
      ]),
    },
  },
}));

function sampleContextCore(): Omit<BoardContextPayload, "documentationBrief"> {
  const display = buildBoardFinancialDisplay({
    baselines: {
      medshield: BOARD_ALE_BASELINES_CENTS.medshield,
      vaultbank: BOARD_ALE_BASELINES_CENTS.vaultbank,
      gridcore: BOARD_ALE_BASELINES_CENTS.gridcore,
    },
    activeTenantId: "5c420f5a-8f1f-4bbf-b42d-7f8dd4bb6a01",
    activeTenantSlug: "medshield",
    activeTenantName: "Medshield",
    activeExposureCents: 1110000000n,
    poolExposureBySlug: {
      medshield: 1110000000n,
      vaultbank: 590000000n,
      gridcore: 470000000n,
    },
    powerUsageKwh: 15000n,
    fluidConsumptionLiters: 3200n,
    doraCompletionPercentage: 100,
    doraStatus: "COMPLIANT",
  });

  return {
    tenantId: "5c420f5a-8f1f-4bbf-b42d-7f8dd4bb6a01",
    timestamp: "2026-06-17T12:00:00.000Z",
    systemStatus: "ARCHITECTURE ENFORCED",
    financials: {
      baselines: BOARD_ALE_BASELINES_CENTS,
      currentExposureCents: 1110000000n,
      display,
    },
    technical: { criticalThreatCount: 0, activeVulnerabilities: [] },
    compliance: {
      frameworks: [{ name: "DORA", status: "COMPLIANT", completionPercentage: 100 }],
    },
    sustainability: { powerUsageKwh: 15000n, fluidConsumptionLiters: 3200n },
    narrativeCache: null,
  };
}

describe("documentationBrief", () => {
  it("emits one-way brief with trainer and writer placement targets", async () => {
    const brief = await buildIronframeDocumentationBrief(sampleContextCore());

    expect(brief.communicationDirection).toBe("ONE_WAY_IRONFRAME_TO_BOARD");
    expect(brief.corpusPlanes.appDocs.readerRoute).toBe("/docs");
    expect(brief.corpusPlanes.governanceBriefings.readerRoute).toBe("/governance-frame");
    expect(brief.outputMatrix.appDocs.plane).toBe("APP_DOCS");
    expect(brief.outputMatrix.governanceBriefings.plane).toBe("GOVERNANCE_BRIEFINGS");
    expect(brief.outputMatrix.promptBlock).toContain("DUAL-LOCATION OUTPUT MATRIX");
    expect(brief.authorAgents.trainer.id).toBe("board-trainer");
    expect(brief.authorAgents.writer.id).toBe("board-writer");
    expect(brief.trainerPlacementTargets).toContain("user-manuals/quickstart.md");
    expect(brief.trainerPlacementTargets).toContain("user-manuals/dashboard-guide.md");
    expect(brief.trainerPlacementTargets).toContain("training/LEVEL1-STUDENT-INDEX.md");
    expect(brief.writerPlacementTargets).toContain("technical/architecture-and-api.md");
    expect(brief.platformFacts.baselineTenantsCents.medshield).toBe("1110000000");
    expect(brief.mandate).toContain("one-way");
  });

  it("includes full-access bundle with Ironframe providing agents for Trainer/Writer", async () => {
    const brief = await buildIronframeDocumentationBrief(sampleContextCore());

    expect(brief.fullAccess.enabled).toBe(true);
    expect(brief.fullAccess.reviewNote).toContain("2–3 weeks");
    expect(brief.fullAccess.providingAgents).toEqual(DOCUMENTATION_PROVIDING_AGENTS);
    expect(brief.fullAccess.documents.length).toBeGreaterThan(0);
    expect(brief.telemetryMirror.compliance.frameworks[0]?.name).toBe("DORA");
  });
});
