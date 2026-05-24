import "server-only";

import { createHash, randomUUID } from "crypto";
import { existsSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import prisma from "@/lib/prisma";
import { auditLogCreateLoose } from "@/lib/auditLogLoose";
import { readCarbonPulseState, pruneSamplesOlderThan24h } from "@/app/lib/ironbloom/carbonPulseState";
import {
  readSustainabilityAchievementSchedulerState,
  writeSustainabilityAchievementSchedulerState,
} from "@/app/lib/sustainabilityAchievementSchedulerState";
import { assessTasMdIntegritySync } from "@/app/lib/tasMdIntegrity";
import {
  buildSustainabilityAchievementReportV1Pdf,
  SUSTAINABILITY_ACHIEVEMENT_REPORT_TEMPLATE,
  SUSTAINABILITY_ACHIEVEMENT_GAVEL_ATTESTATION,
} from "@/app/utils/sustainabilityAchievementReportPdfV1";
import { IroncastService } from "@/services/ironcast.service";
import { TENANT_UUIDS } from "@/app/utils/tenantIsolation";
import { persistAndDispatchPublicTransparency } from "@/app/lib/transparencyPublicDispatch";
import {
  aggregateProductionMitigatedValueCents,
  isSimulationThreatForCsrdExport,
} from "@/app/lib/ironbloom/productionCarbonLedger";
import { IRONTALLY_CSRD_ESRS_E1_6 } from "@/app/config/irontallyFrameworkControls";
import {
  CSRD_TRANSPARENCY_ESTIMATED_REGIONAL_AVG,
  isElectricityMapsApiConfigured,
} from "@/app/services/ironbloom/rateEngine";
import { fetchLiveCarbonIntensityForTenant } from "@/app/services/ironbloom/scoring";
import { tenantKeyFromUuid } from "@/app/utils/tenantIsolation";

const REPORT_ROOT = join(process.cwd(), "storage", "investor-reports");
const WORM_PREFIX = "worm/global";
const GCS_BUCKET = "gs://ironframe-forensic-vault/investor-reports";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

function hashSha256Hex(data: Buffer | string): string {
  return createHash("sha256").update(data).digest("hex");
}

async function flattenRecentPulseGridSamples(): Promise<number[]> {
  const state = await readCarbonPulseState();
  const intensities: number[] = [];
  for (const samples of Object.values(state.samplesByTenant ?? {})) {
    const recent = pruneSamplesOlderThan24h(samples);
    for (const s of recent) intensities.push(s.gco2PerKwh);
  }
  return intensities;
}

function gridStats(intensities: number[]): {
  average: number | null;
  delta: number | null;
} {
  if (!intensities.length) return { average: null, delta: null };
  const avg = intensities.reduce((a, b) => a + b, 0) / intensities.length;
  if (intensities.length < 4) return { average: avg, delta: null };
  const mid = Math.floor(intensities.length / 2);
  const first = intensities.slice(0, mid);
  const second = intensities.slice(mid);
  const m1 = first.reduce((a, b) => a + b, 0) / first.length;
  const m2 = second.reduce((a, b) => a + b, 0) / second.length;
  return { average: avg, delta: m2 - m1 };
}

export type RunSustainabilityAchievementReportOutcome =
  | { ok: true; skipped: true; reason: string }
  | {
      ok: true;
      skipped: false;
      milestoneDays: number;
      pdfSha256: string;
      relativePath: string;
      wormTargetGsUri: string;
    }
  | { ok: false; error: string };

export type RunSustainabilityAchievementReportOptions = {
  /**
   * When true (default for cron): CSRD export uses only Prisma `SustainabilityMetric.mitigated_value_cents`
   * for production threats — simulation / chaos rows and Carbon Pulse scratch samples are excluded.
   */
  productionMode?: boolean;
  /** Tenant scope for production ledger + live intensity (defaults to Medshield roster UUID). */
  tenantUuid?: string;
};

/**
 * Ironscribe investor report: runs when self-healing streak hits multiples of 30 full days.
 * Deduped via `lastMilestoneDays` in scheduler state (resets if `selfHealingActiveSince` changes).
 */
export async function runSustainabilityAchievementReportIfDue(
  options: RunSustainabilityAchievementReportOptions = {},
): Promise<RunSustainabilityAchievementReportOutcome> {
  const productionMode = options.productionMode !== false;
  const reportTenantUuid = options.tenantUuid?.trim() || TENANT_UUIDS.medshield;
  try {
    const row = await prisma.systemConfig.findUnique({
      where: { id: "global" },
      select: { autonomousCarbonMitigation: true, selfHealingActiveSince: true },
    });
    if (!row?.autonomousCarbonMitigation || !row.selfHealingActiveSince) {
      return { ok: true, skipped: true, reason: "Self-healing not active or no continuity anchor." };
    }

    const daysActive = Math.floor((Date.now() - row.selfHealingActiveSince.getTime()) / 86_400_000);
    if (daysActive < 30 || daysActive % 30 !== 0) {
      return {
        ok: true,
        skipped: true,
        reason: `Milestone not reached (daysActive=${daysActive}; need multiple of 30).`,
      };
    }

    const sched = readSustainabilityAchievementSchedulerState();
    const anchor = row.selfHealingActiveSince.toISOString();
    let lastMilestone = sched.lastMilestoneDays;
    if (sched.anchorSelfHealingSince != null && sched.anchorSelfHealingSince !== anchor) {
      lastMilestone = 0;
    }
    if (lastMilestone >= daysActive) {
      return { ok: true, skipped: true, reason: `Already generated for milestone ${daysActive}.` };
    }

    const cutoff = new Date(Date.now() - THIRTY_DAYS_MS);

    let totalKwh = 0n;
    let totalCents = 0n;

    if (productionMode) {
      totalCents = await aggregateProductionMitigatedValueCents(reportTenantUuid, { since: cutoff });
      const tenantCompanyIds = (
        await prisma.company.findMany({
          where: { tenantId: reportTenantUuid },
          select: { id: true },
        })
      ).map((c) => c.id);
      const productionMetrics =
        tenantCompanyIds.length === 0
          ? []
          : await prisma.sustainabilityMetric.findMany({
              where: {
                createdAt: { gte: cutoff },
                threat: { tenantCompanyId: { in: tenantCompanyIds } },
              },
              select: {
                kwhAverted: true,
                threat: { select: { sourceAgent: true, ingestionDetails: true } },
              },
            });
      for (const row of productionMetrics) {
        if (isSimulationThreatForCsrdExport(row.threat)) continue;
        totalKwh += row.kwhAverted;
      }
    } else {
      const agg = await prisma.sustainabilityMetric.aggregate({
        where: { createdAt: { gte: cutoff } },
        _sum: { kwhAverted: true, mitigatedValueCents: true },
      });
      totalKwh = agg._sum.kwhAverted ?? 0n;
      totalCents = agg._sum.mitigatedValueCents ?? 0n;
    }

    let average: number | null = null;
    let delta: number | null = null;
    let gridIntensityTransparencyLabel: string | null = null;
    if (productionMode) {
      const tenantKey = tenantKeyFromUuid(reportTenantUuid);
      if (tenantKey) {
        const live = await fetchLiveCarbonIntensityForTenant(tenantKey);
        average = live.carbonIntensityGco2PerKwh;
        delta = null;
        if (live.source === "FORENSIC_FALLBACK" || live.transparencyLabel) {
          gridIntensityTransparencyLabel =
            live.transparencyLabel ?? CSRD_TRANSPARENCY_ESTIMATED_REGIONAL_AVG;
        }
      }
    } else {
      const intensities = await flattenRecentPulseGridSamples();
      const stats = gridStats(intensities);
      average = stats.average;
      delta = stats.delta;
    }

    const tas = assessTasMdIntegritySync();
    const constitutionalTasSha256 = tas.ok ? tas.sha256 : null;

    const kimbotCsrdPath = productionMode ? "production" : "simulation";
    const csrdComplianceStandard = IRONTALLY_CSRD_ESRS_E1_6.controlId;
    const compositePayload = {
      template: SUSTAINABILITY_ACHIEVEMENT_REPORT_TEMPLATE,
      generatedAt: new Date().toISOString(),
      milestoneDays: daysActive,
      productionMode,
      kimbotCsrdPath,
      csrdProductionLedgerOnly: productionMode,
      csrdComplianceStandard,
      esrsE16IrontallyAnchor: IRONTALLY_CSRD_ESRS_E1_6,
      mitigatedSustainabilityAleCents: totalCents.toString(),
      totalKwhSaved: totalKwh.toString(),
      averageGridIntensityGco2PerKwh: average,
      gridIntensityDeltaGco2PerKwh: delta,
      gridIntensitySource: productionMode
        ? isElectricityMapsApiConfigured()
          ? "electricity-maps"
          : "FORENSIC_FALLBACK"
        : "carbon-pulse-simulation",
      gridIntensityTransparencyLabel:
        gridIntensityTransparencyLabel ??
        (productionMode && !isElectricityMapsApiConfigured()
          ? CSRD_TRANSPARENCY_ESTIMATED_REGIONAL_AVG
          : null),
      irontallyFrameworkControls: [IRONTALLY_CSRD_ESRS_E1_6],
      constitutionalTasSha256,
      gavel: SUSTAINABILITY_ACHIEVEMENT_GAVEL_ATTESTATION,
    };
    const compositeBodySha256 = hashSha256Hex(JSON.stringify(compositePayload));

    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const relDir = join(WORM_PREFIX, stamp);
    const absDir = join(REPORT_ROOT, relDir);
    if (!existsSync(absDir)) mkdirSync(absDir, { recursive: true });

    const filename = "Sustainability_Achievement_Report_V1.pdf";
    const wormTargetGsUri = `${GCS_BUCKET}/${stamp}/${filename}`;

    const pdfBytes = await buildSustainabilityAchievementReportV1Pdf({
      generatedAtIso: compositePayload.generatedAt,
      reportingPeriodLabel: "Ledger: rolling 30 days · Grid telemetry: Carbon Pulse retention window (typically ≤24h)",
      mitigatedSustainabilityAleCents: totalCents,
      totalKwhSaved: totalKwh,
      averageGridIntensityGco2PerKwh: average,
      gridIntensityDeltaGco2PerKwh: delta,
      constitutionalTasSha256,
      compositeBodySha256,
      wormTargetGsUri,
    });

    const pdfSha256 = hashSha256Hex(Buffer.from(pdfBytes));
    const relPath = join(relDir, filename).replace(/\\/g, "/");
    const absPdf = join(REPORT_ROOT, relPath);
    writeFileSync(absPdf, Buffer.from(pdfBytes));

    const manifest = {
      template: SUSTAINABILITY_ACHIEVEMENT_REPORT_TEMPLATE,
      generatedAt: compositePayload.generatedAt,
      milestoneDays: daysActive,
      pdfSha256,
      compositeBodySha256,
      constitutionalTasSha256,
      wormTargetGsUri,
      localRelativePath: relPath,
      gcsUploadNote:
        "Upload this object to the configured WORM bucket when cloud credentials are bound; local path is the attested forensic mirror.",
    };
    writeFileSync(join(absDir, "manifest.json"), JSON.stringify(manifest, null, 2), "utf8");

    const latest = {
      template: SUSTAINABILITY_ACHIEVEMENT_REPORT_TEMPLATE,
      generatedAt: compositePayload.generatedAt,
      milestoneDays: daysActive,
      pdfSha256,
      relativePath: relPath,
      wormTargetGsUri,
      gavel: SUSTAINABILITY_ACHIEVEMENT_GAVEL_ATTESTATION,
    };
    writeFileSync(join(REPORT_ROOT, "latest.json"), JSON.stringify(latest, null, 2), "utf8");

    writeSustainabilityAchievementSchedulerState({
      lastMilestoneDays: daysActive,
      lastRunAt: compositePayload.generatedAt,
      anchorSelfHealingSince: anchor,
    });

    try {
      await auditLogCreateLoose({
        data: {
          action: "GOVERNANCE_ACHIEVEMENT_LOG",
          justification: JSON.stringify({
            event: "SUSTAINABILITY_ACHIEVEMENT_REPORT",
            kimbotCsrdPath,
            csrdComplianceStandard,
            gridIntensityTransparencyLabel: compositePayload.gridIntensityTransparencyLabel,
            irontallyControlId: IRONTALLY_CSRD_ESRS_E1_6.controlId,
            template: SUSTAINABILITY_ACHIEVEMENT_REPORT_TEMPLATE,
            milestoneDays: daysActive,
            pdfSha256,
            compositeBodySha256,
            wormTargetGsUri,
            localRelativePath: relPath,
            ironscribeAgent: "IRONSCRIBE_AGENT_5",
            gavel: SUSTAINABILITY_ACHIEVEMENT_GAVEL_ATTESTATION,
          }),
          operatorId: "IRONSCRIBE_AGENT_5",
          threatId: null,
          isSimulation: false,
        },
      });
    } catch {
      /* best-effort */
    }

    const notifyEmail =
      process.env.GRC_EMAIL_EXECUTIVE?.trim() ||
      process.env.ADMIN_ALERT_EMAIL?.trim() ||
      process.env.ZOHO_EMAIL_USER?.trim();
    if (notifyEmail && process.env.RESEND_API_KEY) {
      try {
        await IroncastService.dispatch({
          tenant_id: TENANT_UUIDS.medshield,
          sanitization_status: "VERIFIED_SYSTEM_GENERATED",
          irongate_trace_id: randomUUID(),
          recipient: { email: notifyEmail, role: "SYSTEM_ADMIN" },
          notification: {
            priority: "NOTICE",
            subject: `Ironcast · ${SUSTAINABILITY_ACHIEVEMENT_REPORT_TEMPLATE} ready`,
            body_summary: `Investor-grade sustainability achievement report generated (milestone ${daysActive} days). PDF SHA-256: ${pdfSha256.slice(0, 16)}… Open Executive Dashboard → Share with Board/Investors for a time-bound link.`,
          },
          timestamp: BigInt(Date.now()),
        });
      } catch (e) {
        console.warn("[sustainabilityAchievementReport] Ironcast notify skipped:", e);
      }
    }

    try {
      const { webhook } = await persistAndDispatchPublicTransparency({
        generatedAt: compositePayload.generatedAt,
        milestoneDays: daysActive,
        mitigatedSustainabilityAleCents: totalCents,
        totalKwhSaved: totalKwh,
        averageGridIntensityGco2PerKwh: average,
        gridIntensityDeltaGco2PerKwh: delta,
        constitutionalTasSha256,
        pdfArtifactSha256: pdfSha256,
        relativePath: relPath,
        wormGsUri: wormTargetGsUri,
        compositeInternalSha256: compositeBodySha256,
      });
      if (!webhook.ok && !webhook.skipped) {
        console.warn("[sustainabilityAchievementReport] transparency CMS webhook:", webhook.error);
      }
    } catch (e) {
      console.warn("[sustainabilityAchievementReport] public transparency dispatch skipped:", e);
    }

    return {
      ok: true,
      skipped: false,
      milestoneDays: daysActive,
      pdfSha256,
      relativePath: relPath,
      wormTargetGsUri,
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
