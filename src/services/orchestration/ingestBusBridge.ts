import "server-only";

import { SovereignGraphState } from "@/src/services/orchestration/state";

type GraphState = typeof SovereignGraphState.State;

export type IngestOrchestrationBusInput = {
  tenantId: string;
  threatId: string;
  rawPayload?: Record<string, unknown>;
  healthBarPercent?: number;
  threadId?: string;
};

export type IngestOrchestrationBusResult =
  | {
      ok: true;
      agentLogs: string[];
      currentAgent: string;
      ironquerySignature: string;
      status: GraphState["status"];
      routingTarget: string;
    }
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

/**
 * Epic 10.5 — Run the compiled sovereign workforce bus for a live threat ingress cycle.
 */
export async function invokeIngestOrchestrationBus(
  input: IngestOrchestrationBusInput,
  options?: { body?: Record<string, unknown> },
): Promise<IngestOrchestrationBusResult> {
  const tenantId = input.tenantId.trim();
  const threatId = input.threatId.trim();
  if (!tenantId || !threatId) {
    return { ok: false, error: "MISSING_TENANT_OR_THREAT_ID" };
  }

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

  try {
    const { compileSovereignOrchestrationBus } = await import(
      "@/src/services/orchestration/graph"
    );
    const bus = await compileSovereignOrchestrationBus();
    console.info(
      `[AGENT BUS ACTIVATED] Routing threat ${threatId} for tenant ${tenantId} through the workforce circuit.`,
    );

    const finalizedState = await bus.invoke(
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
      { configurable: { thread_id: threadId } },
    );

    return {
      ok: true,
      agentLogs: finalizedState.agent_logs ?? [],
      currentAgent: finalizedState.current_agent ?? "END",
      ironquerySignature: finalizedState.ironquery_summary_signature ?? "",
      status: finalizedState.status ?? "COMPLETED",
      routingTarget: finalizedState.routing_target ?? "END",
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[ingestBusBridge] INGRESS_ORCHESTRATION_BUS_CRASH:", message);
    return { ok: false, error: message };
  }
}
