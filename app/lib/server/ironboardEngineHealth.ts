import "server-only";

import { resolveIronboardUpstreamUrl } from "@/app/lib/server/ironboardConsoleProxy";

export const IRONBOARD_HEALTH_RETRY_INTERVAL_SEC = 20;

export type IronboardEngineHealthSnapshot = {
  checkedAt: string;
  reachable: boolean;
  status: string | null;
  latencyMs: number | null;
  healthUrl: string;
  upstreamBase: string;
  error: string | null;
  retryIntervalSec: number;
};

export async function probeIronboardEngineHealth(): Promise<IronboardEngineHealthSnapshot> {
  const healthUrl = resolveIronboardUpstreamUrl("/health", "");
  const upstreamBase = healthUrl.replace(/\/health$/, "");
  const started = Date.now();

  try {
    const response = await fetch(healthUrl, {
      cache: "no-store",
      signal: AbortSignal.timeout(4_000),
    });
    const latencyMs = Date.now() - started;
    let status: string | null = null;

    try {
      const body = (await response.json()) as { status?: string; service?: string };
      status = body.status ?? body.service ?? null;
    } catch {
      status = response.ok ? "OK" : `HTTP ${response.status}`;
    }

    if (!response.ok) {
      return {
        checkedAt: new Date().toISOString(),
        reachable: false,
        status,
        latencyMs,
        healthUrl,
        upstreamBase,
        error: status ?? `HTTP ${response.status}`,
        retryIntervalSec: IRONBOARD_HEALTH_RETRY_INTERVAL_SEC,
      };
    }

    return {
      checkedAt: new Date().toISOString(),
      reachable: true,
      status,
      latencyMs,
      healthUrl,
      upstreamBase,
      error: null,
      retryIntervalSec: IRONBOARD_HEALTH_RETRY_INTERVAL_SEC,
    };
  } catch (err) {
    return {
      checkedAt: new Date().toISOString(),
      reachable: false,
      status: null,
      latencyMs: Date.now() - started,
      healthUrl,
      upstreamBase,
      error: err instanceof Error ? err.message : "Ironboard health probe failed",
      retryIntervalSec: IRONBOARD_HEALTH_RETRY_INTERVAL_SEC,
    };
  }
}
