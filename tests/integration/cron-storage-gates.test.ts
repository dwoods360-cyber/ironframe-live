import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

type ArtifactRow = {
  id: string;
  tenantId: string;
  agentName: string;
  payloadJson?: unknown;
  metricValue?: bigint | null;
  metricUnit?: string | null;
};

const {
  artifactRows,
  createArtifact,
  findFirstArtifact,
  mockScoutRun,
  mockDriveSync,
  mockDailyAudit,
  mockRegulatoryPoll,
  mockMaturityScore,
  mockCarbonBudget,
  mockGridcorePoll,
  mockGridcoreUtility,
  mockAuditLogCreateLoose,
} = vi.hoisted(() => {
  const rows: ArtifactRow[] = [];
  const create = vi.fn(async ({ data, select }: any) => {
    const row: ArtifactRow = {
      id: `artifact-${rows.length + 1}`,
      tenantId: data.tenantId,
      agentName: data.agentName,
      payloadJson: data.payloadJson,
      metricValue: data.metricValue ?? null,
      metricUnit: data.metricUnit ?? null,
    };
    rows.push(row);
    if (select?.id) return { id: row.id };
    return row;
  });

  const findFirst = vi.fn(async ({ where }: any) => {
    return (
      rows.find((row) => {
        const tenantMatches = where?.tenantId ? row.tenantId === where.tenantId : true;
        const agentMatches = where?.agentName ? row.agentName === where.agentName : true;
        return tenantMatches && agentMatches;
      }) ?? null
    );
  });

  const scout = vi.fn(async () => ({
    ok: true,
    feedsPolled: 3,
    discovered: 3,
    newlyIngested: 2,
    ingestedItemIds: ["item-a", "item-b"],
    errors: [],
  }));

  const drive = vi.fn(async () => ({
    ok: true,
    filesSynced: 1,
  }));

  const dailyAudit = vi.fn(async () => ({
    ok: true,
    reportPath: "blob://forensics/daily-report.md",
  }));

  const regulatoryPoll = vi.fn(async () => ({
    ok: true,
    updates: 2,
  }));

  const maturity = vi.fn(async () => ({
    current: {
      score: 93,
    },
  }));

  const carbonBudget = vi.fn(async () => ({
    ok: true,
    mitigatedValueCents: BigInt(1_250_000),
  }));

  const gridcorePoll = vi.fn(async () => ({
    status: "ok",
    recordsIngested: 4,
  }));

  const gridcoreUtility = vi.fn(async () => ({
    ok: true,
    rateDeltaPct: 1.1,
  }));

  const auditLoose = vi.fn(async () => undefined);

  return {
    artifactRows: rows,
    createArtifact: create,
    findFirstArtifact: findFirst,
    mockScoutRun: scout,
    mockDriveSync: drive,
    mockDailyAudit: dailyAudit,
    mockRegulatoryPoll: regulatoryPoll,
    mockMaturityScore: maturity,
    mockCarbonBudget: carbonBudget,
    mockGridcorePoll: gridcorePoll,
    mockGridcoreUtility: gridcoreUtility,
    mockAuditLogCreateLoose: auditLoose,
  };
});

vi.mock("@/lib/prisma", () => ({
  default: {
    cronJobArtifact: {
      create: createArtifact,
      findFirst: findFirstArtifact,
    },
  },
}));

vi.mock("@/app/services/ironsight/crawler", () => ({
  runIndustryScoutWorker: mockScoutRun,
}));

vi.mock("@/app/services/ironscribe/driveSync", () => ({
  runIronscribeDriveSync: mockDriveSync,
}));

vi.mock("@/src/services/ironscribe/auditSynthesizer", () => ({
  runIronscribeDailyAuditSynthesis: mockDailyAudit,
}));

vi.mock("@/app/services/ironsightMonitor", () => ({
  runIronsightRegulatoryPoll: mockRegulatoryPoll,
}));

vi.mock("@/app/services/governanceScoring", () => ({
  recalculateSystemMaturityScore: mockMaturityScore,
}));

vi.mock("@/app/services/ironbloom/carbonBudgetReallocationAlert", () => ({
  runCarbonBudgetReallocationAlertIfDue: mockCarbonBudget,
}));

vi.mock("@/src/services/ironbloom/gridcoreRatePoll", () => ({
  executeGridcoreRatePoll: mockGridcorePoll,
}));

vi.mock("@/app/services/ironbloom/rateEngine", () => ({
  runGridcoreUtilityRatePoll: mockGridcoreUtility,
}));

vi.mock("@/lib/auditLogLoose", () => ({
  auditLogCreateLoose: mockAuditLogCreateLoose,
}));

vi.mock("@/app/utils/parseCronRequestBody", () => ({
  parseCronRequestBody: vi.fn(async () => ({})),
}));

import prisma from "@/lib/prisma";
import { GET as getIndustryScout } from "@/app/api/internal/cron/industry-scout/route";
import { GET as getIronscribeDailyAudit } from "@/app/api/internal/cron/ironscribe-daily-audit/route";
import { GET as getIronsightRegulatoryPoll } from "@/app/api/internal/cron/ironsight-regulatory-poll/route";
import { GET as getCarbonBudgetReallocation } from "@/app/api/internal/cron/carbon-budget-reallocation/route";
import { GET as getGridcoreRatePoll } from "@/app/api/internal/cron/gridcore-rate-poll/route";

const ROUTE_ASSERTION_MATRIX = [
  {
    name: "industry-scout",
    agentName: "industry-scout",
    getHandler: getIndustryScout,
    path: "industry-scout",
  },
  {
    name: "ironscribe-daily-audit",
    agentName: "ironscribe-daily-audit",
    getHandler: getIronscribeDailyAudit,
    path: "ironscribe-daily-audit",
  },
  {
    name: "ironsight-regulatory-poll",
    agentName: "ironsight-regulatory-poll",
    getHandler: getIronsightRegulatoryPoll,
    path: "ironsight-regulatory-poll",
  },
  {
    name: "carbon-budget-reallocation",
    agentName: "carbon-budget-reallocation",
    getHandler: getCarbonBudgetReallocation,
    path: "carbon-budget-reallocation?force=1",
  },
  {
    name: "gridcore-rate-poll",
    agentName: "gridcore-rate-poll",
    getHandler: getGridcoreRatePoll,
    path: "gridcore-rate-poll?force=1&utility=1",
  },
] as const;

describe("Cron storage gates", () => {
  beforeEach(() => {
    artifactRows.length = 0;
    createArtifact.mockClear();
    findFirstArtifact.mockClear();
    mockScoutRun.mockClear();
    mockDriveSync.mockClear();
    mockDailyAudit.mockClear();
    mockRegulatoryPoll.mockClear();
    mockMaturityScore.mockClear();
    mockCarbonBudget.mockClear();
    mockGridcorePoll.mockClear();
    mockGridcoreUtility.mockClear();
    mockAuditLogCreateLoose.mockClear();
    process.env.IRONFRAME_CRON_SECRET = "cron-secret";
  });

  for (const target of ROUTE_ASSERTION_MATRIX) {
    it(`${target.name}: returns 200, non-degraded, and persists CronJobArtifact row`, async () => {
      const tenantId = "5c420f5a-8f1f-4bbf-b42d-7f8dd4bb6a01";
      const request = new NextRequest(`https://example.com/api/internal/cron/${target.path}`, {
        method: "GET",
        headers: {
          Authorization: "Bearer cron-secret",
          "x-tenant-id": tenantId,
        },
      });

      const response = await target.getHandler(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.degraded).toBe(false);

      const artifact = await (prisma as any).cronJobArtifact.findFirst({
        where: {
          tenantId,
          agentName: target.agentName,
        },
      });

      expect(artifact).toBeTruthy();
      expect(artifact.tenantId).toBe(tenantId);
      expect(artifact.agentName).toBe(target.agentName);
    });
  }
});
