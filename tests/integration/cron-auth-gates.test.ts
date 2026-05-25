import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { checkCronAuth } from "@/app/api/internal/cron/_cronAuth";
import * as HealthPostureCron from "@/app/api/internal/cron/health-posture-triage/route";
import * as CarbonBudgetCron from "@/app/api/internal/cron/carbon-budget-reallocation/route";
import * as IndustryScoutCron from "@/app/api/internal/cron/industry-scout/route";
import * as IronscribeDailyAuditCron from "@/app/api/internal/cron/ironscribe-daily-audit/route";
import * as IronsightRegulatoryCron from "@/app/api/internal/cron/ironsight-regulatory-poll/route";
import * as IronwatchApiHeartbeatCron from "@/app/api/internal/cron/ironwatch-api-heartbeat/route";
import * as IronwatchSecurityCron from "@/app/api/internal/cron/ironwatch-security-monitor/route";
import * as SustainabilityAchievementCron from "@/app/api/internal/cron/sustainability-achievement-report/route";
import * as Agent17SentinelCron from "@/app/api/internal/cron/agent17-sentinel/route";

type CronModule = {
  GET?: (req: NextRequest) => Promise<Response>;
  POST?: (req: NextRequest) => Promise<Response>;
};

const ROUTES: Array<{ name: string; mod: CronModule }> = [
  { name: "health-posture-triage", mod: HealthPostureCron },
  { name: "carbon-budget-reallocation", mod: CarbonBudgetCron },
  { name: "industry-scout", mod: IndustryScoutCron },
  { name: "ironscribe-daily-audit", mod: IronscribeDailyAuditCron },
  { name: "ironsight-regulatory-poll", mod: IronsightRegulatoryCron },
  { name: "ironwatch-api-heartbeat", mod: IronwatchApiHeartbeatCron },
  { name: "ironwatch-security-monitor", mod: IronwatchSecurityCron },
  { name: "sustainability-achievement-report", mod: SustainabilityAchievementCron },
  { name: "agent17-sentinel", mod: Agent17SentinelCron },
];

function buildReq(headers: Record<string, string> = {}): NextRequest {
  return new NextRequest("http://localhost:3000/api/internal/cron/test", {
    method: "GET",
    headers: new Headers(headers),
  });
}

describe("Cron auth helper and gate lock-down", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.IRONFRAME_CRON_SECRET = "test-cron-secret";
  });

  it("checkCronAuth accepts valid Bearer token", () => {
    const req = buildReq({ Authorization: "Bearer test-cron-secret" });
    expect(checkCronAuth(req)).toBe(true);
  });

  it("checkCronAuth accepts valid x-cron-secret token", () => {
    const req = buildReq({ "x-cron-secret": "test-cron-secret" });
    expect(checkCronAuth(req)).toBe(true);
  });

  it("checkCronAuth rejects invalid/missing tokens", () => {
    expect(checkCronAuth(buildReq())).toBe(false);
    expect(checkCronAuth(buildReq({ Authorization: "Bearer wrong" }))).toBe(false);
    expect(checkCronAuth(buildReq({ "x-cron-secret": "wrong" }))).toBe(false);
  });

  for (const route of ROUTES) {
    it(`${route.name}: GET returns 401 when auth is missing`, async () => {
      if (!route.mod.GET) return;
      const res = await route.mod.GET(buildReq());
      expect(res.status).toBe(401);
    });

    it(`${route.name}: POST returns 401 when auth is missing`, async () => {
      if (!route.mod.POST) return;
      const req = new NextRequest("http://localhost:3000/api/internal/cron/test", {
        method: "POST",
        headers: new Headers({ "Content-Type": "application/json" }),
        body: JSON.stringify({ ping: true }),
      });
      const res = await route.mod.POST(req);
      expect(res.status).toBe(401);
    });
  }
});
