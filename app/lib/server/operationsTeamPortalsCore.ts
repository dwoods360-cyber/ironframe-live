import "server-only";

import {
  fetchPendingApprovalDrafts,
} from "@/app/lib/server/approvalQueueCore";
import type { SalesteamProspectWire } from "@/app/lib/server/salesteamIngressCore";
import { listInboundProspectLeads } from "@/app/lib/server/inboundLeadOpsCore";
import { listSalesteamProspectQueue } from "@/app/lib/server/salesteamIngressCore";
import {
  collapseSuspectRowsByCompany,
  purgeDuplicateSuspectContacts,
} from "@/app/lib/server/dedupeIronleadsSuspectsCore";
import { looksLikeOsintTitleNoise } from "@/app/lib/server/ironleadsBuyingCommitteeExtract";
import { resolveOperatorHold } from "@/app/lib/server/ironleadsOperatorHoldCore";
import { purgeOsintTitleNoiseSuspects } from "@/app/lib/server/ironleadsOsintNoisePurgeCore";
import { isPendingBatchHold } from "@/app/lib/server/ironleadsPendingPoolCore";
import { resolveSuspectLocationFields } from "@/app/lib/server/ironleadsSuspectLocation";
import {
  compareSuspectReadiness,
  scoreSuspectReadiness,
} from "@/app/lib/ironleadsSuspectReadiness";
import {
  getSuccessTeamHealthSnapshot,
  listSuccessTeamAccounts,
  type SuccessTeamAccountWire,
  type SuccessTeamHealthSnapshotWire,
} from "@/app/lib/server/successTeamIngressCore";
import type { SupportTeamTicketWire } from "@/app/lib/server/supportTeamIngressCore";
import { listSupportTeamIntakeQueue } from "@/app/lib/server/supportTeamIngressCore";
import prisma from "@/lib/prisma";

function workerBaseUrl(envKey: string, fallbackPort: number): string {
  const raw = process.env[envKey]?.trim();
  if (raw) return raw.replace(/\/$/, "");
  return `http://127.0.0.1:${fallbackPort}`;
}

export type IronleadsPortalSuspectRow = {
  id: string;
  company: string;
  priorityScore: number;
  detectedTrigger: string | null;
  websiteUrl: string | null;
  addressLine: string | null;
  createdAt: string;
  /** Named buyer on file (CISO / operator-seeded). */
  namedBuyerName?: string | null;
  /** Higher = more complete dossier for HITL review. */
  readinessScore?: number;
  holdReason?: string | null;
  holdClassification?: string | null;
  holdAt?: string | null;
};

export type IronleadsPortalSnapshot = {
  generatedAt: string;
  worker: {
    reachable: boolean;
    healthUrl: string;
    status: string | null;
    pipeline: string[] | null;
  };
  /** Active SUSPECT review queue (excludes HOLD archive). Newest first. */
  suspects: IronleadsPortalSuspectRow[];
  /** Total active SUSPECTs after collapse (may exceed `suspects.length`). */
  activeCount: number;
  /** Directory overflow waiting to be pulled into the active batch of 20. */
  pendingPool: IronleadsPortalSuspectRow[];
  pendingCount: number;
  /** Operator HOLD archive — parked for later retrieval (excludes pending pool). */
  holdArchive: IronleadsPortalSuspectRow[];
  holdCount: number;
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

  // Collapse harvest clones before listing (also clears DB duplexes from older races).
  await purgeDuplicateSuspectContacts();
  // Directive / article titles must never sit in the SUSPECT queue.
  await purgeOsintTitleNoiseSuspects();

  const suspectsRaw = await prisma.ironboardCrmContact.findMany({
    where: { primaryDeals: { some: { stage: "SUSPECT" } } },
    orderBy: [{ createdAt: "desc" }, { priorityScore: "desc" }],
    take: 500,
    select: {
      id: true,
      company: true,
      priorityScore: true,
      detectedTrigger: true,
      metadata: true,
      createdAt: true,
      primaryDeals: {
        where: { stage: "SUSPECT" },
        orderBy: { updatedAt: "desc" },
        take: 1,
        select: { accountDomain: true },
      },
    },
  });

  const collapsed = collapseSuspectRowsByCompany(suspectsRaw).filter(
    (row) => !looksLikeOsintTitleNoise(row.company),
  );
  const readinessKey = (row: (typeof collapsed)[number]) => ({
    metadata: row.metadata,
    accountDomain: row.primaryDeals[0]?.accountDomain ?? null,
    priorityScore: row.priorityScore,
    createdAt: row.createdAt,
  });
  // Active queue: named buyers + fullest dossiers first for HITL review.
  const activeRows = collapsed
    .filter((row) => !resolveOperatorHold(row.metadata))
    .sort((a, b) => compareSuspectReadiness(readinessKey(a), readinessKey(b)));
  const pendingRows = collapsed
    .filter((row) => isPendingBatchHold(row.metadata))
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  const holdRows = collapsed.filter(
    (row) => resolveOperatorHold(row.metadata) && !isPendingBatchHold(row.metadata),
  );

  const mapRow = (row: (typeof collapsed)[number]): IronleadsPortalSuspectRow => {
    const accountDomain = row.primaryDeals[0]?.accountDomain ?? null;
    const location = resolveSuspectLocationFields({
      metadata: row.metadata,
      accountDomain,
    });
    const hold = resolveOperatorHold(row.metadata);
    const readiness = scoreSuspectReadiness({
      metadata: row.metadata,
      accountDomain,
      priorityScore: row.priorityScore,
    });
    return {
      id: row.id,
      company: row.company,
      priorityScore: row.priorityScore,
      detectedTrigger: row.detectedTrigger,
      websiteUrl: location.websiteUrl,
      addressLine: location.addressLine,
      createdAt: row.createdAt.toISOString(),
      namedBuyerName: location.namedBuyer?.fullName ?? null,
      readinessScore: Math.round(readiness.score),
      holdReason: hold?.reason ?? null,
      holdClassification: hold?.classification ?? null,
      holdAt: hold?.at ?? null,
    };
  };

  return {
    generatedAt: new Date().toISOString(),
    worker: { reachable, healthUrl, status, pipeline },
    suspects: activeRows.slice(0, 80).map(mapRow),
    activeCount: activeRows.length,
    pendingPool: pendingRows.slice(0, 80).map(mapRow),
    pendingCount: pendingRows.length,
    holdArchive: holdRows.slice(0, 40).map(mapRow),
    holdCount: holdRows.length,
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

export type SalesTeamPortalSnapshot = {
  generatedAt: string;
  worker: {
    reachable: boolean;
    healthUrl: string;
    status: string | null;
  };
  /** Public /register/contact hand-raisers — always P1 over cold PROSPECT queue. */
  inboundLeads: Array<{
    id: string;
    orgName: string;
    slug: string;
    email: string;
    reportedAleCents: string;
    createdAt: string;
    opsStatus: string | null;
    priority: number;
    sourceRef: string;
  }>;
  prospects: SalesteamProspectWire[];
  polledAt: string;
};

export type SupportIntakePortalSnapshot = {
  generatedAt: string;
  worker: {
    reachable: boolean;
    healthUrl: string;
    status: string | null;
  };
  intakes: SupportTeamTicketWire[];
  approvalQueueDepth: number;
  polledAt: string;
};


export async function buildSalesTeamPortalSnapshot(
  tenantSlug: string,
): Promise<SalesTeamPortalSnapshot> {
  const healthUrl = `${workerBaseUrl("OPERATIONS_SALESTEAM_URL", 8084)}/health`;
  let reachable = false;
  let status: string | null = null;

  try {
    const healthRes = await fetch(healthUrl, { cache: "no-store", signal: AbortSignal.timeout(4_000) });
    reachable = healthRes.ok;
    if (healthRes.ok) {
      const body = (await healthRes.json()) as { status?: string; service?: string };
      status = body.service ?? body.status ?? "OK";
    }
  } catch {
    reachable = false;
  }

  const [prospectResult, inboundLeads] = await Promise.all([
    listSalesteamProspectQueue(tenantSlug, 25),
    listInboundProspectLeads(40),
  ]);

  return {
    generatedAt: new Date().toISOString(),
    worker: { reachable, healthUrl, status },
    inboundLeads,
    prospects: prospectResult.prospects,
    polledAt: prospectResult.polledAt,
  };
}

export async function triggerSalesTeamPoll(): Promise<{ ok: boolean; result?: unknown; error?: string }> {
  const pollUrl = `${workerBaseUrl("OPERATIONS_SALESTEAM_URL", 8084)}/poll`;
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

export async function buildSupportIntakePortalSnapshot(
  tenantSlug: string,
): Promise<SupportIntakePortalSnapshot> {
  const healthUrl = `${workerBaseUrl("OPERATIONS_SUPPORT_TEAM_URL", 8086)}/health`;
  let reachable = false;
  let status: string | null = null;

  try {
    const healthRes = await fetch(healthUrl, { cache: "no-store", signal: AbortSignal.timeout(4_000) });
    reachable = healthRes.ok;
    if (healthRes.ok) {
      const body = (await healthRes.json()) as { status?: string; service?: string };
      status = body.service ?? body.status ?? "OK";
    }
  } catch {
    reachable = false;
  }

  const [intakeResult, drafts] = await Promise.all([
    listSupportTeamIntakeQueue(tenantSlug, 25),
    fetchPendingApprovalDrafts(),
  ]);

  return {
    generatedAt: new Date().toISOString(),
    worker: { reachable, healthUrl, status },
    intakes: intakeResult.tickets,
    approvalQueueDepth: drafts.filter((draft) => draft.draftKind === "SUPPORT").length,
    polledAt: intakeResult.polledAt,
  };
}

export async function triggerSupportTeamPoll(): Promise<{ ok: boolean; result?: unknown; error?: string }> {
  const pollUrl = `${workerBaseUrl("OPERATIONS_SUPPORT_TEAM_URL", 8086)}/poll`;
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
