import "server-only";

import { createHash } from "crypto";
import { auditLogCreateLoose } from "@/lib/auditLogLoose";
import {
  appendCarbonSample,
  pruneSamplesOlderThan24h,
  readCarbonPulseState,
  writeCarbonPulseState,
  type DirtyGridAlertRecord,
} from "@/app/lib/ironbloom/carbonPulseState";
import { fetchLiveCarbonIntensity } from "@/app/services/ironbloom/scoring";
import { TENANT_ELECTRICITY_MAP_ZONES } from "@/app/config/tenantCarbonZones";
import { tenantKeyFromUuid } from "@/app/utils/tenantIsolation";
import prisma from "@/lib/prisma";

/** Top 25% regional intensity → dirty threshold (75th percentile of 24h window). */
const DIRTY_PERCENTILE = 0.75;
const ALERT_COOLDOWN_MS = 60 * 60 * 1000;
const DEFAULT_USAGE_BASELINE_KWH = 1000;

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor(p * sorted.length)));
  return sorted[idx]!;
}

export type DirtyGridMonitorResult = {
  zone: string;
  currentIntensityGco2PerKwh: number;
  thresholdGco2PerKwh: number;
  tenantUsageKwh: number;
  usageBaselineKwh: number;
  isDirty: boolean;
  alertIssued: boolean;
  alert?: DirtyGridAlertRecord;
};

async function resolveTenantUsageKwh(tenantId: string): Promise<number> {
  const companies = await prisma.company.findMany({
    where: { tenantId },
    select: { id: true },
  });
  if (!companies.length) return 0;
  const companyIds = companies.map((c) => c.id);
  const threats = await prisma.threatEvent.findMany({
    where: { tenantCompanyId: { in: companyIds } },
    select: { id: true },
    take: 200,
    orderBy: { updatedAt: "desc" },
  });
  if (!threats.length) return 0;
  const metrics = await prisma.sustainabilityMetric.aggregate({
    where: { threatId: { in: threats.map((t) => t.id) } },
    _sum: { kwhAverted: true },
  });
  return Number(metrics._sum.kwhAverted ?? 0n);
}

/**
 * Agent 6 (Ironlock): Dirty Grid monitor — intensity vs regional P75 + usage baseline.
 */
export async function runDirtyGridMonitorForTenant(
  tenantId: string,
  options?: { mitigatedValueCents?: bigint; skipAuditIfClean?: boolean },
): Promise<DirtyGridMonitorResult> {
  const tenantKey = tenantKeyFromUuid(tenantId) ?? "medshield";
  const zone = TENANT_ELECTRICITY_MAP_ZONES[tenantKey];
  const quote = await fetchLiveCarbonIntensity(zone, tenantKey);

  let state = await readCarbonPulseState();
  const samples = pruneSamplesOlderThan24h(state.samplesByTenant[tenantId] ?? []);
  const intensities = [...samples.map((s) => s.gco2PerKwh), quote.carbonIntensityGco2PerKwh].sort(
    (a, b) => a - b,
  );
  const thresholdGco2PerKwh = Math.max(
    quote.carbonIntensityGco2PerKwh * 0.85,
    percentile(intensities, DIRTY_PERCENTILE),
  );

  const tenantUsageKwh = await resolveTenantUsageKwh(tenantId);
  const usageBaselineKwh =
    Number(process.env.IRONBLOOM_USAGE_BASELINE_KWH?.trim()) || DEFAULT_USAGE_BASELINE_KWH;

  const isDirty =
    quote.carbonIntensityGco2PerKwh > thresholdGco2PerKwh && tenantUsageKwh > usageBaselineKwh;

  const mitigatedCents = options?.mitigatedValueCents?.toString() ?? "0";
  state = appendCarbonSample(state, tenantId, {
    at: quote.polledAt,
    zone: quote.zone,
    gco2PerKwh: quote.carbonIntensityGco2PerKwh,
    mitigatedValueCents: mitigatedCents,
    dirty: isDirty,
  });

  let alertIssued = false;
  let alert: DirtyGridAlertRecord | undefined;

  if (isDirty) {
    const lastAt = state.lastDirtyAlertAtByTenant[tenantId];
    const cooled =
      lastAt && Date.now() - Date.parse(lastAt) < ALERT_COOLDOWN_MS;
    if (!cooled) {
      const intensity = Math.round(quote.carbonIntensityGco2PerKwh);
      const message = `IRONLOCK ALERT: Dirty Grid Detected. Intensity at ${intensity} gCO2/kWh. Shifting high-compute tasks is recommended to protect Sustainability ALE.`;
      const sentAt = new Date().toISOString();
      const evidencePayload = {
        v: 1 as const,
        agent: "IRONLOCK_AGENT_6",
        event: "DIRTY_GRID_THROTTLE_EVIDENCE",
        tenantId,
        sentAt,
        zone,
        intensityGco2PerKwh: quote.carbonIntensityGco2PerKwh,
        thresholdGco2PerKwh,
        tenantUsageKwh,
        usageBaselineKwh,
      };
      const evidenceArtifactSha256 = createHash("sha256")
        .update(JSON.stringify(evidencePayload))
        .digest("hex");
      alert = {
        id: createHash("sha256")
          .update(`${tenantId}:${sentAt}:${evidenceArtifactSha256}`, "utf8")
          .digest("hex")
          .slice(0, 12),
        tenantId,
        sentAt,
        intensityGco2PerKwh: quote.carbonIntensityGco2PerKwh,
        thresholdGco2PerKwh,
        tenantUsageKwh,
        usageBaselineKwh,
        message,
        evidenceArtifactSha256,
      };
      state = {
        ...state,
        dirtyGridAlerts: [...state.dirtyGridAlerts, alert].slice(-100),
        lastDirtyAlertAtByTenant: {
          ...state.lastDirtyAlertAtByTenant,
          [tenantId]: alert.sentAt,
        },
      };
      alertIssued = true;

      try {
        await auditLogCreateLoose({
          data: {
            action: "CARBON_MITIGATION_EVENT",
            justification: JSON.stringify({
              agent: "IRONLOCK_AGENT_6",
              event: "DIRTY_GRID_ALERT",
              alert,
              zone,
            }),
            operatorId: "IRONLOCK_AGENT_6",
            threatId: null,
            isSimulation: false,
            tenant_id: tenantId,
          },
        });
      } catch {
        /* best-effort */
      }
    }
  }

  await writeCarbonPulseState(state);

  return {
    zone: quote.zone,
    currentIntensityGco2PerKwh: quote.carbonIntensityGco2PerKwh,
    thresholdGco2PerKwh,
    tenantUsageKwh,
    usageBaselineKwh,
    isDirty,
    alertIssued,
    alert,
  };
}
