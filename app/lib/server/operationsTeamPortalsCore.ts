import "server-only";

import prisma from "@/lib/prisma";

import {
  getSuccessTeamHealthSnapshot,
  listSuccessTeamAccounts,
  type SuccessTeamAccountWire,
  type SuccessTeamHealthSnapshotWire,
} from "@/app/lib/server/successTeamIngressCore";

function workerBaseUrl(envKey: string, fallbackPort: number): string {
  const raw = process.env[envKey]?.trim();
  if (raw) return raw.replace(/\/$/, "");
  return `http://127.0.0.1:${fallbackPort}`;
}

export type IronleadsPortalSnapshot = {
  generatedAt: string;
  worker: {
    reachable: boolean;
    healthUrl: string;
    status: string | null;
    pipeline: string[] | null;
  };
  suspects: Array<{
    id: string;
    company: string;
    priorityScore: number;
    detectedTrigger: string | null;
    createdAt: string;
  }>;
};

export type SuccessTeamPortalSnapshot = {
  generatedAt: string;
  tenantSlug: string;
  worker: {
    reachable: boolean;
    healthUrl: string;
    status: string | null;
  };
  accounts: SuccessTeamAccountWire[];
  healthByDealId: Record<string, SuccessTeamHealthSnapshotWire>;
  polledAt: string;
};

export async function buildIronleadsPortalSnapshot(): Promise<IronleadsPortalSnapshot> {
  const healthUrl = `${workerBaseUrl("OPERATIONS_IRONLEADS_URL", 8083)}/health`;
  const pipelineUrl = `${workerBaseUrl("OPERATIONS_IRONLEADS_URL", 8083)}/api/pipeline`;

  let reachable = false;
  let status: string | null = null;
  let pipeline: string[] | null = null;

  try {
    const healthRes = await fetch(healthUrl, { cache: "no-store", signal: AbortSignal.timeout(4_000) });
    reachable = healthRes.ok;
    if (healthRes.ok) {
      const body = (await healthRes.json()) as { status?: string; service?: string };
      status = body.status ?? body.service ?? "OK";
    }
  } catch {
    reachable = false;
  }

  if (reachable) {
    try {
      const pipelineRes = await fetch(pipelineUrl, {
        cache: "no-store",
        signal: AbortSignal.timeout(4_000),
      });
      if (pipelineRes.ok) {
        const body = (await pipelineRes.json()) as { nodes?: string[] };
        pipeline = body.nodes ?? null;
      }
    } catch {
      pipeline = null;
    }
  }

  const suspects = await prisma.ironboardCrmContact.findMany({
    where: { primaryDeals: { some: { stage: "SUSPECT" } } },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      company: true,
      priorityScore: true,
      detectedTrigger: true,
      createdAt: true,
    },
  });

  return {
    generatedAt: new Date().toISOString(),
    worker: { reachable, healthUrl, status, pipeline },
    suspects: suspects.map((row) => ({
      id: row.id,
      company: row.company,
      priorityScore: row.priorityScore,
      detectedTrigger: row.detectedTrigger,
      createdAt: row.createdAt.toISOString(),
    })),
  };
}

export async function triggerIronleadsHarvest(input?: {
  scoutOnly?: boolean;
  skipIngress?: boolean;
}): Promise<{ ok: boolean; result?: unknown; error?: string }> {
  const harvestUrl = `${workerBaseUrl("OPERATIONS_IRONLEADS_URL", 8083)}/api/harvest`;
  try {
    const response = await fetch(harvestUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        scoutOnly: Boolean(input?.scoutOnly),
        skipIngress: Boolean(input?.skipIngress),
      }),
      signal: AbortSignal.timeout(120_000),
    });
    const body = (await response.json()) as { ok?: boolean; error?: string };
    if (!response.ok) {
      return { ok: false, error: body.error ?? `Harvest failed (${response.status})` };
    }
    return { ok: true, result: body };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Harvest request failed" };
  }
}

export async function buildSuccessTeamPortalSnapshot(
  tenantSlug: string,
): Promise<SuccessTeamPortalSnapshot> {
  const healthUrl = `${workerBaseUrl("OPERATIONS_SUCCESS_TEAM_URL", 8085)}/health`;
  let reachable = false;
  let status: string | null = null;

  try {
    const healthRes = await fetch(healthUrl, { cache: "no-store", signal: AbortSignal.timeout(4_000) });
    reachable = healthRes.ok;
    if (healthRes.ok) {
      const body = (await healthRes.json()) as { status?: string; service?: string; brand?: string };
      status = body.brand ?? body.service ?? body.status ?? "OK";
    }
  } catch {
    reachable = false;
  }

  const accountResult = await listSuccessTeamAccounts(tenantSlug, 25);
  const healthByDealId: Record<string, SuccessTeamHealthSnapshotWire> = {};

  for (const account of accountResult.accounts.slice(0, 8)) {
    try {
      healthByDealId[account.dealId] = await getSuccessTeamHealthSnapshot(tenantSlug, account.dealId);
    } catch {
      // skip accounts that fail health bind
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    tenantSlug,
    worker: { reachable, healthUrl, status },
    accounts: accountResult.accounts,
    healthByDealId,
    polledAt: accountResult.polledAt,
  };
}

export async function triggerSuccessTeamPoll(): Promise<{ ok: boolean; result?: unknown; error?: string }> {
  const pollUrl = `${workerBaseUrl("OPERATIONS_SUCCESS_TEAM_URL", 8085)}/poll`;
  try {
    const response = await fetch(pollUrl, {
      method: "POST",
      signal: AbortSignal.timeout(120_000),
    });
    const body = (await response.json()) as { ok?: boolean; error?: string };
    if (!response.ok) {
      return { ok: false, error: body.error ?? `Poll failed (${response.status})` };
    }
    return { ok: true, result: body };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Poll request failed" };
  }
}
