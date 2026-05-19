import "server-only";

import { randomUUID } from "crypto";

import { auditLogCreateLoose } from "@/lib/auditLogLoose";
import { logStructuredEvent } from "@/lib/structuredServerLog";
import prisma from "@/lib/prisma";
import { recalculateSystemMaturityScore } from "@/app/services/governanceScoring";
import { IroncastService } from "@/services/ironcast.service";
import {
  computeSustainabilityStaleLockdown,
} from "@/app/config/sustainabilityStaleLockdown";
import { hashStaleLockdownWitnessPayload } from "@/app/lib/sustainabilityStaleLockdownWitness";
import {
  ensureStateFreezeCisoEscalation,
  maybeDispatchStateFreezeCisoVoiceFallback,
} from "@/src/services/ironcast/stateFreezeCisoEscalation";
import { runIrontechLkgSpawnProtocol } from "@/src/services/irontech/autonomousDecoupling";

/** Logged on each check; matches `SystemHealthLog.serviceKey`. */
export const IRONWATCH_SERVICE_KEY_ELECTRICITY_MAPS = "ELECTRICITY_MAPS_LIVE";

/** 15 minutes — align cron to this cadence. */
export const IRONWATCH_CHECK_INTERVAL_MS = 15 * 60 * 1000;

/** Wall-clock stale threshold before maturity penalty + Stale Data mode. */
export const IRONWATCH_STALE_DATA_THRESHOLD_MS = 4 * 60 * 60 * 1000;

/** `consecutive_failures * check_interval >= 4h` → ceil(4h / 15m) = 16. */
export const IRONWATCH_MIN_CONSECUTIVE_FAILURES = Math.ceil(
  IRONWATCH_STALE_DATA_THRESHOLD_MS / IRONWATCH_CHECK_INTERVAL_MS,
);

const ELECTRICITY_MAPS_LATEST = "https://api.electricitymaps.com/v3/carbon-intensity/latest";

export const IRONWATCH_STALE_DATA_IRONCAST_BODY =
  "IRONWATCH: External Sustainability API has been unreachable for 4 hours. System entering 'Stale Data' mode.";

export const IRONWATCH_FIDELITY_RESTORED_IRONCAST_BODY =
  "Fidelity Restored. Standard justification requirements resumed.";

export type ElectricityMapsPingResult = {
  ok: boolean;
  skipped?: boolean;
  httpStatus?: number;
  latencyMs: number;
  error?: string;
};

/**
 * Live ping to Electricity Maps (same family as Ironbloom scoring). Without `ELECTRICITY_MAPS_API_KEY`,
 * returns `ok: true` + `skipped` so dev environments do not auto-degrade.
 */
export async function pingElectricityMapsLive(): Promise<ElectricityMapsPingResult> {
  const started = Date.now();
  const token = process.env.ELECTRICITY_MAPS_API_KEY?.trim();
  if (!token) {
    return {
      ok: true,
      skipped: true,
      latencyMs: Date.now() - started,
      error: "ELECTRICITY_MAPS_API_KEY not set — heartbeat skipped (dev)",
    };
  }

  const zone = process.env.IRONWATCH_ELECTRICITY_MAPS_ZONE?.trim() || "US-CA";
  const url = new URL(ELECTRICITY_MAPS_LATEST);
  url.searchParams.set("zone", zone);

  try {
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(12_000),
      cache: "no-store",
    });
    const latencyMs = Date.now() - started;
    if (!res.ok) {
      return { ok: false, httpStatus: res.status, latencyMs, error: `HTTP ${res.status}` };
    }
    const data = (await res.json()) as Record<string, unknown>;
    const intensity =
      typeof data.carbonIntensity === "number"
        ? data.carbonIntensity
        : typeof data.carbon_intensity === "number"
          ? data.carbon_intensity
          : null;
    if (intensity == null || intensity <= 0) {
      return {
        ok: false,
        httpStatus: res.status,
        latencyMs,
        error: "missing carbon intensity in response",
      };
    }
    return { ok: true, httpStatus: res.status, latencyMs };
  } catch (e) {
    return {
      ok: false,
      latencyMs: Date.now() - started,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

async function ironcastNotifyStaleData(): Promise<void> {
  const adminRow = await prisma.systemConfig.findUnique({
    where: { id: "global" },
    select: { adminAlertEmail: true },
  });
  const adminEmail =
    adminRow?.adminAlertEmail?.trim() ||
    process.env.THREAT_CONFIRMATION_RECIPIENTS?.split(",")[0]?.trim() ||
    process.env.IRONCAST_SMOKE_RECIPIENT?.trim();

  if (!adminEmail) {
    logStructuredEvent("Ironwatch", "stale_data_notify_skipped", { reason: "no_admin_email" }, "warn");
    return;
  }

  const tenant = await prisma.tenant.findFirst({ select: { id: true } });
  const tenantId = tenant?.id ?? "00000000-0000-0000-0000-000000000001";

  try {
    await IroncastService.dispatch({
      tenant_id: tenantId,
      sanitization_status: "VERIFIED_SYSTEM_GENERATED",
      irongate_trace_id: randomUUID(),
      recipient: { email: adminEmail, role: "SYSTEM_ADMIN" },
      notification: {
        priority: "HIGH",
        subject: "IRONWATCH · External Sustainability API stale (4h)",
        body_summary: IRONWATCH_STALE_DATA_IRONCAST_BODY,
      },
      timestamp: BigInt(Math.floor(Date.now() / 1000)),
    });
  } catch (e) {
    logStructuredEvent(
      "Ironwatch",
      "ironcast_failed",
      { detail: e instanceof Error ? e.message : String(e) },
      "error",
    );
  }
}

async function ironcastNotifyFidelityRestored(): Promise<void> {
  const adminRow = await prisma.systemConfig.findUnique({
    where: { id: "global" },
    select: { adminAlertEmail: true },
  });
  const adminEmail =
    adminRow?.adminAlertEmail?.trim() ||
    process.env.THREAT_CONFIRMATION_RECIPIENTS?.split(",")[0]?.trim() ||
    process.env.IRONCAST_SMOKE_RECIPIENT?.trim();

  if (!adminEmail) {
    logStructuredEvent("Ironwatch", "fidelity_restored_notify_skipped", { reason: "no_admin_email" }, "warn");
    return;
  }

  const tenant = await prisma.tenant.findFirst({ select: { id: true } });
  const tenantId = tenant?.id ?? "00000000-0000-0000-0000-000000000001";

  try {
    await IroncastService.dispatch({
      tenant_id: tenantId,
      sanitization_status: "VERIFIED_SYSTEM_GENERATED",
      irongate_trace_id: randomUUID(),
      recipient: { email: adminEmail, role: "SYSTEM_ADMIN" },
      notification: {
        priority: "NOTICE",
        subject: "IRONWATCH · Fidelity restored",
        body_summary: IRONWATCH_FIDELITY_RESTORED_IRONCAST_BODY,
      },
      timestamp: BigInt(Math.floor(Date.now() / 1000)),
    });
    logStructuredEvent("Ironwatch", "fidelity_restored_ironcast", { to: adminEmail }, "info");
  } catch (e) {
    logStructuredEvent(
      "Ironwatch",
      "fidelity_restored_ironcast_failed",
      { detail: e instanceof Error ? e.message : String(e) },
      "error",
    );
  }
}

async function maybeEmitIrontechStaleLockdownWitness(): Promise<void> {
  const row = await prisma.systemConfig.findUnique({
    where: { id: "global" },
    select: {
      sustainabilityLiveApiDegraded: true,
      sustainabilityApiDegradedSince: true,
      sustainabilityStaleLockdownWaived: true,
      sustainabilityStaleLockdownWitnessAt: true,
    },
  });
  const lock = computeSustainabilityStaleLockdown(row);
  if (!lock.staleDataLockdownWindow || !row?.sustainabilityApiDegradedSince) return;
  if (row.sustainabilityStaleLockdownWaived) return;
  if (row.sustainabilityStaleLockdownWitnessAt) return;

  const health = await prisma.systemHealthLog.findFirst({
    where: { serviceKey: IRONWATCH_SERVICE_KEY_ELECTRICITY_MAPS },
    orderBy: { createdAt: "desc" },
    select: { id: true, createdAt: true },
  });

  const witnessPayload = {
    agent: "IRONTECH_AGENT_12",
    event: "SUSTAINABILITY_STALE_LOCKDOWN_24H",
    degradedSinceIso: row.sustainabilityApiDegradedSince.toISOString(),
    systemHealthLogWitnessId: health?.id ?? null,
    hoursDegraded: lock.hoursDegraded,
  };
  const witnessSha256 = hashStaleLockdownWitnessPayload(witnessPayload);

  await prisma.systemConfig.update({
    where: { id: "global" },
    data: { sustainabilityStaleLockdownWitnessAt: new Date() },
  });

  try {
    await auditLogCreateLoose({
      data: {
        action: "IRONTECH_SUSTAINABILITY_STALE_LOCKDOWN",
        justification: JSON.stringify({
          ...witnessPayload,
          witnessSha256,
          message:
            "Irontech (Agent 12): cryptographic witness — sustainability live API degraded ≥24h consecutive wall-clock; system-wide mutation freeze engaged until heartbeat healthy or tripartite stale-data waiver. Linked to latest SystemHealthLog row for Ironwatch service key.",
        }),
        operatorId: "IRONTECH_AGENT_12",
        threatId: null,
        isSimulation: false,
      },
    });
  } catch (e) {
    console.error("[Ironwatch] stale lockdown witness audit failed", e);
  }

  await recalculateSystemMaturityScore({ trigger: "IRONTECH_STALE_LOCKDOWN_24H" });
}

export type IronwatchHeartbeatRunResult = {
  ping: ElectricityMapsPingResult;
  consecutiveFailures: number;
  wasDegraded: boolean;
  isDegraded: boolean;
  enteredStaleMode: boolean;
  recovered: boolean;
};

/**
 * Single Ironwatch beat: persist `SystemHealthLog`, update `SystemConfig` counters,
 * optionally enter/exit Stale Data mode, Ironcast on transition, maturity recalc + AuditLog witness.
 */
export async function runIronwatchElectricityMapsHeartbeat(): Promise<IronwatchHeartbeatRunResult> {
  const ping = await pingElectricityMapsLive();

  await prisma.systemHealthLog.create({
    data: {
      serviceKey: IRONWATCH_SERVICE_KEY_ELECTRICITY_MAPS,
      ok: ping.ok,
      httpStatus: ping.httpStatus ?? null,
      latencyMs: ping.latencyMs,
      detail: ping.error
        ? ping.error.slice(0, 4000)
        : ping.ok
          ? ping.skipped
            ? "skipped"
            : "ok"
          : "fail",
      meta: ping.skipped ? { skipped: true } : undefined,
    },
  });

  const cfg = await prisma.systemConfig.findUnique({ where: { id: "global" } });
  const wasDegraded = cfg?.sustainabilityLiveApiDegraded === true;
  const nowPre = new Date();
  if (wasDegraded && cfg && !cfg.sustainabilityApiDegradedSince) {
    await prisma.systemConfig.update({
      where: { id: "global" },
      data: {
        sustainabilityApiDegradedSince: cfg.ironwatchStaleDataNotifiedAt ?? nowPre,
      },
    });
  }
  let failures = cfg?.sustainabilityApiHeartbeatFailures ?? 0;
  let isDegraded = wasDegraded;
  let enteredStaleMode = false;
  let recovered = false;

  const now = new Date();

  if (ping.ok) {
    failures = 0;
    if (wasDegraded) {
      isDegraded = false;
      recovered = true;
      await prisma.systemConfig.update({
        where: { id: "global" },
        data: {
          sustainabilityApiHeartbeatFailures: 0,
          sustainabilityLiveApiDegraded: false,
          sustainabilityApiLastHeartbeatAt: now,
          ironwatchStaleDataNotifiedAt: null,
          sustainabilityApiDegradedSince: null,
          sustainabilityStaleLockdownWaived: false,
          sustainabilityStaleLockdownWitnessAt: null,
        },
      });

      try {
        await auditLogCreateLoose({
          data: {
            action: "IRONWATCH_SUSTAINABILITY_API_RECOVERED",
            justification: JSON.stringify({
              event: "IRONWATCH_RECOVERY",
              agent: "IRONWATCH_AGENT_15",
              message:
                "External sustainability live feed healthy — Stale Data mode cleared; Ironwatch self-healing witness (maturity penalty removed).",
              ping: { latencyMs: ping.latencyMs, httpStatus: ping.httpStatus ?? null },
            }),
            operatorId: "IRONWATCH_AGENT_15",
            threatId: null,
            isSimulation: false,
          },
        });
      } catch (e) {
        console.error("[Ironwatch] recovery audit failed", e);
      }

      await recalculateSystemMaturityScore({ trigger: "IRONWATCH_RECOVERY" });
      await ironcastNotifyFidelityRestored();
    } else {
      await prisma.systemConfig.update({
        where: { id: "global" },
        data: {
          sustainabilityApiHeartbeatFailures: 0,
          sustainabilityApiLastHeartbeatAt: now,
        },
      });
    }
  } else {
    failures += 1;
    const shouldDegrade = failures >= IRONWATCH_MIN_CONSECUTIVE_FAILURES;

    if (shouldDegrade && !wasDegraded) {
      isDegraded = true;
      enteredStaleMode = true;
      await prisma.systemConfig.update({
        where: { id: "global" },
        data: {
          sustainabilityApiHeartbeatFailures: failures,
          sustainabilityLiveApiDegraded: true,
          sustainabilityApiLastHeartbeatAt: now,
          ironwatchStaleDataNotifiedAt: now,
          sustainabilityApiDegradedSince: now,
          sustainabilityStaleLockdownWaived: false,
          sustainabilityStaleLockdownWitnessAt: null,
          stateFreezeEscalatedAt: null,
          stateFreezeVoiceDispatchedAt: null,
        },
      });

      try {
        await auditLogCreateLoose({
          data: {
            action: "IRONWATCH_STALE_DATA_MODE",
            justification: JSON.stringify({
              event: "IRONWATCH_STALE_DATA",
              agent: "IRONWATCH_AGENT_15",
              consecutiveFailures: failures,
              thresholdFailures: IRONWATCH_MIN_CONSECUTIVE_FAILURES,
              message: IRONWATCH_STALE_DATA_IRONCAST_BODY,
            }),
            operatorId: "IRONWATCH_AGENT_15",
            threatId: null,
            isSimulation: false,
          },
        });
      } catch (e) {
        console.error("[Ironwatch] stale mode audit failed", e);
      }

      await ironcastNotifyStaleData();
      await recalculateSystemMaturityScore({ trigger: "IRONWATCH_STALE_DATA" });
    } else {
      await prisma.systemConfig.update({
        where: { id: "global" },
        data: {
          sustainabilityApiHeartbeatFailures: failures,
          sustainabilityApiLastHeartbeatAt: now,
        },
      });
    }
  }

  await maybeEmitIrontechStaleLockdownWitness();
  await ensureStateFreezeCisoEscalation();
  await maybeDispatchStateFreezeCisoVoiceFallback();

  try {
    const t = await prisma.tenant.findFirst({ select: { id: true }, orderBy: { id: "asc" } });
    if (t?.id) {
      await runIrontechLkgSpawnProtocol(t.id);
    }
  } catch {
    /* optional */
  }

  return {
    ping,
    consecutiveFailures: failures,
    wasDegraded,
    isDegraded,
    enteredStaleMode,
    recovered,
  };
}
