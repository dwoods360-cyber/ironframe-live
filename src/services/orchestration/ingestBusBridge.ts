import "server-only";

import { tenantKeyFromUuid } from "@/app/utils/tenantIsolation";
import { SovereignGraphState } from "@/src/services/orchestration/state";

type SovereignGraphStateType = typeof SovereignGraphState.State;

export type IngestOrchestrationLane = "forensic" | "sovereign";

export type IngestOrchestrationBusInput = {
  tenantId: string;
  threatId: string;
  rawPayload?: Record<string, unknown>;
  healthBarPercent?: number;
  threadId?: string;
};

type IngestBusSuccessBase = {
  ok: true;
  lane: IngestOrchestrationLane;
  agentLogs: string[];
  currentAgent: string;
  routingTarget: string;
  status: string;
};

export type IngestOrchestrationBusResult =
  | (IngestBusSuccessBase & {
      lane: "sovereign";
      ironquerySignature: string;
      status: SovereignGraphStateType["status"];
    })
  | (IngestBusSuccessBase & {
      lane: "forensic";
      sanitizationStamp: boolean;
      osintEnveloped: boolean;
      rlsPolicyStatements: string[];
      complianceFrameworkId: string;
    })
  | { ok: false; error: string };

function resolveHealthBarPercent(
  body: Record<string, unknown> | undefined,
  explicit?: number,
): number {
  if (typeof explicit === "number" && Number.isFinite(explicit)) {
    return Math.max(0, Math.min(100, explicit));
  }
  const fromBody =
    body?.currentHealthBarPercent ??
    body?.healthBarPercent ??
    body?.health_bar_percent;
  if (typeof fromBody === "number" && Number.isFinite(fromBody)) {
    return Math.max(0, Math.min(100, fromBody));
  }
  return 100;
}

export function ingestOrchestrationBusDisabled(body: Record<string, unknown>): boolean {
  if (body.skipOrchestrationBus === true || body.skipOrchestrationBus === "1") return true;
  return process.env.IRONFRAME_INGEST_BUS_DISABLED?.trim() === "1";
}

function firstString(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

/** Epic 10 — OSINT / compliance ingress signals for forensic graph routing. */
export function resolveIngressSource(
  body: Record<string, unknown> | undefined,
  rawPayload: Record<string, unknown>,
  parsedIngest?: Record<string, unknown>,
): string {
  const candidates = [
    body?.source,
    body?.ingestionSource,
    body?.ingressSource,
    rawPayload.source,
    parsedIngest?.source,
    body?.contentTag,
    parsedIngest?.contentTag,
  ];
  for (const candidate of candidates) {
    const normalized = String(candidate ?? "").trim().toUpperCase();
    if (normalized === "OSINT") return "OSINT";
  }
  return "EXTERNAL_INGRESS";
}

export function resolveCompliancePayloadContent(
  body: Record<string, unknown> | undefined,
  rawPayload: Record<string, unknown>,
  parsedIngest?: Record<string, unknown>,
): string | undefined {
  const candidates = [
    body?.payloadContent,
    body?.contentTag,
    body?.complianceFrameworkId,
    rawPayload.payloadContent,
    rawPayload.contentTag,
    parsedIngest?.payloadContent,
    parsedIngest?.contentTag,
  ];
  for (const candidate of candidates) {
    const text = String(candidate ?? "").trim();
    if (!text) continue;
    const upper = text.toUpperCase();
    if (upper.includes("CSRD") || upper.includes("COMPLIANCE")) return text;
  }
  return undefined;
}

/**
 * Epic 10.5 — default forensic DMZ bus; sovereign document bus when explicitly requested.
 */
export function resolveIngestOrchestrationLane(
  body: Record<string, unknown> | undefined,
  rawPayload?: Record<string, unknown>,
): IngestOrchestrationLane {
  const lane = firstString(body?.orchestrationLane, body?.ingestOrchestrationLane).toLowerCase();
  if (lane === "forensic" || lane === "sovereign") return lane;

  if (body?.useSovereignBus === true || body?.useSovereignBus === "1") return "sovereign";
  if (body?.useForensicGraph === true || body?.useForensicGraph === "1") return "forensic";

  if (process.env.IRONFRAME_INGEST_SOVEREIGN_BUS?.trim() === "1") return "sovereign";
  if (process.env.IRONFRAME_INGEST_FORENSIC_GRAPH?.trim() === "0") return "sovereign";

  const payload = rawPayload ?? {};
  const source = resolveIngressSource(body, payload);
  if (source === "OSINT") return "forensic";
  if (resolveCompliancePayloadContent(body, payload)) return "forensic";

  return "forensic";
}

export function buildForensicIngressPayload(
  input: IngestOrchestrationBusInput,
  options?: {
    body?: Record<string, unknown>;
    parsedIngest?: Record<string, unknown>;
  },
): Record<string, unknown> {
  const tenantId = input.tenantId.trim();
  const threatId = input.threatId.trim();
  const health = resolveHealthBarPercent(options?.body, input.healthBarPercent);
  const rawPayload: Record<string, unknown> = {
    threat_id: threatId,
    threatId,
    tenant_id: tenantId,
    tenantId,
    healthBarPercent: health,
    ...(input.rawPayload ?? {}),
  };

  const tenantKey = tenantKeyFromUuid(tenantId) ?? "medshield";
  const source = resolveIngressSource(options?.body, rawPayload, options?.parsedIngest);
  const complianceContent = resolveCompliancePayloadContent(
    options?.body,
    rawPayload,
    options?.parsedIngest,
  );

  return {
    ...rawPayload,
    tenantId: tenantKey,
    source,
    ...(complianceContent
      ? { payloadContent: complianceContent, contentTag: complianceContent }
      : {}),
  };
}

async function invokeIngestSovereignBus(
  input: IngestOrchestrationBusInput,
  options?: { body?: Record<string, unknown> },
): Promise<IngestOrchestrationBusResult> {
  const tenantId = input.tenantId.trim();
  const threatId = input.threatId.trim();
  const health = resolveHealthBarPercent(options?.body, input.healthBarPercent);
  const rawPayload: Record<string, unknown> = {
    threat_id: threatId,
    threatId,
    tenant_id: tenantId,
    tenantId,
    healthBarPercent: health,
    ...(input.rawPayload ?? {}),
  };
  const threadId = input.threadId?.trim() || threatId;

  const { compileSovereignOrchestrationBus } = await import("@/src/services/orchestration/graph");
  const { invokeGraphWithForensicRollback } = await import(
    "@/src/services/orchestration/forensicRollback",
  );
  const bus = await compileSovereignOrchestrationBus();
  console.info(
    `[SOVEREIGN BUS ACTIVATED] Routing threat ${threatId} for tenant ${tenantId} through the workforce circuit.`,
  );

  const config = { configurable: { thread_id: threadId } };
  const finalizedState = await invokeGraphWithForensicRollback(
    bus,
    {
      tenant_id: tenantId,
      threat_id: threatId,
      raw_payload: rawPayload,
      current_agent: "IRONCORE",
      routing_target: "ironscribe",
      health_bar_percent: health,
      status: "PENDING",
      agent_logs: [],
    },
    config,
    { tenantId, threadId },
  );

  return {
    ok: true,
    lane: "sovereign",
    agentLogs: finalizedState.agent_logs ?? [],
    currentAgent: finalizedState.current_agent ?? "END",
    ironquerySignature: finalizedState.ironquery_summary_signature ?? "",
    status: finalizedState.status ?? "COMPLETED",
    routingTarget: finalizedState.routing_target ?? "END",
  };
}

async function invokeIngestForensicBus(
  input: IngestOrchestrationBusInput,
  options?: { body?: Record<string, unknown>; parsedIngest?: Record<string, unknown> },
): Promise<IngestOrchestrationBusResult> {
  const tenantId = input.tenantId.trim();
  const threatId = input.threatId.trim();
  const threadId = input.threadId?.trim() || threatId;
  const payload = buildForensicIngressPayload(input, options);
  const source = String(payload.source ?? "EXTERNAL_INGRESS");

  const { compileOrchestrationGraphWithCheckpoint } = await import(
    "@/src/services/orchestration/forensicPipelineGraph"
  );
  const { invokeGraphWithForensicRollback } = await import(
    "@/src/services/orchestration/forensicRollback"
  );
  const graph = await compileOrchestrationGraphWithCheckpoint();
  console.info(
    `[FORENSIC BUS ACTIVATED] Routing threat ${threatId} for tenant ${tenantId} (source=${source}) through Epic 10 perimeter pipeline.`,
  );

  const config = { configurable: { thread_id: threadId } };
  const finalizedState = await invokeGraphWithForensicRollback(
    graph,
    {
      threatId,
      tenantId,
      payload,
      history: [],
      historyLogs: [],
    },
    config,
    { tenantId, threadId },
  );

  const history = finalizedState.history ?? [];
  const lastPerimeter = history.length > 0 ? history[history.length - 1] : null;
  const historyLogs = finalizedState.historyLogs ?? [];
  const logLines = historyLogs.map(
    (entry) => `[${entry.agentId}] ${entry.message}`,
  );

  return {
    ok: true,
    lane: "forensic",
    agentLogs: logLines,
    currentAgent: (lastPerimeter?.agent ?? "irongate").toUpperCase(),
    routingTarget: lastPerimeter?.agent ?? finalizedState.routingTarget ?? "END",
    status: lastPerimeter?.status ?? "COMPLETED",
    sanitizationStamp: finalizedState.sanitizationStamp === true,
    osintEnveloped: finalizedState.osintEnveloped === true,
    rlsPolicyStatements: finalizedState.rlsPolicyStatements ?? [],
    complianceFrameworkId: finalizedState.complianceFrameworkId ?? "",
  };
}

/**
 * Epic 10.5 — Run the ingest orchestration lane for a live threat ingress cycle.
 * Default lane: forensic graph (Irongate-first, OSINT/compliance paths). Sovereign bus when opted in.
 */
export async function invokeIngestOrchestrationBus(
  input: IngestOrchestrationBusInput,
  options?: { body?: Record<string, unknown>; parsedIngest?: Record<string, unknown> },
): Promise<IngestOrchestrationBusResult> {
  const tenantId = input.tenantId.trim();
  const threatId = input.threatId.trim();
  if (!tenantId || !threatId) {
    return { ok: false, error: "MISSING_TENANT_OR_THREAT_ID" };
  }

  const rawPayload: Record<string, unknown> = {
    threat_id: threatId,
    threatId,
    tenant_id: tenantId,
    tenantId,
    ...(input.rawPayload ?? {}),
  };

  const lane = resolveIngestOrchestrationLane(options?.body, rawPayload);

  try {
    if (lane === "forensic") {
      return await invokeIngestForensicBus(input, options);
    }
    return await invokeIngestSovereignBus(input, options);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error(`[ingestBusBridge] INGRESS_ORCHESTRATION_BUS_CRASH (${lane}):`, message);
    return { ok: false, error: message };
  }
}
