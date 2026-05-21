/**
 * Irontech / structural repair (Section 4.3): consume shadow-plane `SimulationDiagnosticLog` rows where
 * `action === "OPERATIONAL_DEFICIENCY_REPORT"`; payload `snapshot.ingestionDetailsFull` is the full ingestion blob.
 *
 * Agent 9 (Ironmap) — decoupling: **Ironcore** may emit **partial state transitions** (e.g. IRONTRUST) when
 * live carbon feeds are degraded; see `IronCore.route` + `ironmap/criticalPath.ts`.
 *
 * Epic 10 — `compileSovereignOrchestrationBus` sequences Ironcore → Ironscribe → Ironsight → Ironquery
 * → (Ironlock | Ironcast) for the specialist workforce bus; `createSovereignGraph` retains the full roster graph.
 */
import { randomUUID } from "crypto";
import { StateGraph, END } from "@langchain/langgraph";
import { SovereignGraphState } from "./state";
import { IronCore } from "../agents/ironcore";
import { IronScribe } from "../agents/ironscribe";
import { IronTrust } from "../agents/irontrust";
import { TheWarden } from "../agents/warden";
import { getPostgresCheckpointer } from "./checkpointer";
import { Ironbloom } from "../agents/ironbloom";
import { ironsightCvePoll } from "../agents/ironsight";
import { irontallyFrameworkMap } from "../agents/irontally";
import { generateIronqueryAnalystInsight } from "../agents/ironquery";
import {
  getIronlockGovernanceDelayMsForTenantSync,
  IRONLOCK_AUTO_THROTTLE_NOTIFICATION,
} from "../agents/ironlock/throttlingEngine";
import { healthBarRequiresTriage } from "@/app/config/tasHealthTriage";
import { evaluateSystemTriage } from "@/src/services/irontech/triageRouter";
import { auditLogCreateLoose } from "@/lib/auditLogLoose";
import { IroncastService } from "@/services/ironcast.service";

type GraphState = typeof SovereignGraphState.State;

function resolveHealthBarPercent(state: GraphState): number {
  const raw = state.raw_payload as Record<string, unknown> | undefined;
  const fromPayload = raw?.healthBarPercent ?? raw?.health_bar_percent;
  if (typeof fromPayload === "number" && Number.isFinite(fromPayload)) {
    return Math.max(0, Math.min(100, fromPayload));
  }
  if (typeof state.health_bar_percent === "number" && Number.isFinite(state.health_bar_percent)) {
    return state.health_bar_percent;
  }
  return 100;
}

function resolveThreatId(state: GraphState): string {
  const raw = state.raw_payload as Record<string, unknown> | undefined;
  const candidates = [
    state.threat_id,
    raw?.threat_id,
    raw?.threatId,
  ];
  for (const c of candidates) {
    if (typeof c === "string" && c.trim()) return c.trim();
  }
  return "";
}

function resolveThreadId(state: GraphState, threatId: string): string {
  const raw = state.raw_payload as Record<string, unknown> | undefined;
  const trace =
    (typeof raw?.trace_id === "string" && raw.trace_id.trim()) ||
    (typeof raw?.threadId === "string" && raw.threadId.trim()) ||
    threatId ||
    state.tenant_id;
  return trace;
}

async function ironlockGovernanceDelayIfThrottled(
  tenantId: string,
  agentKey: string,
): Promise<{ delayMs: number; logs: string[] }> {
  const delayMs = getIronlockGovernanceDelayMsForTenantSync(tenantId);
  if (delayMs <= 0) return { delayMs: 0, logs: [] };
  await new Promise<void>((resolve) => {
    setTimeout(resolve, delayMs);
  });
  return {
    delayMs,
    logs: [
      IRONLOCK_AUTO_THROTTLE_NOTIFICATION,
      `SIG_THROTTLE:${agentKey}:governance_delay_ms=${delayMs}`,
    ],
  };
}

/** Non-critical background chain: Ironsight → Ironquery → Irontally (Agent 6 may insert governance_delay). */
const ironsightThrottled = async (state: GraphState) => {
  const { logs } = await ironlockGovernanceDelayIfThrottled(state.tenant_id, "ironsight");
  return logs.length ? { agent_logs: logs } : {};
};

const ironqueryThrottled = async (state: GraphState) => {
  const { logs } = await ironlockGovernanceDelayIfThrottled(state.tenant_id, "ironquery");
  return logs.length ? { agent_logs: logs } : {};
};

const irontallyThrottled = async (state: GraphState) => {
  const { logs } = await ironlockGovernanceDelayIfThrottled(state.tenant_id, "irontally");
  return logs.length ? { agent_logs: logs } : {};
};

/** Background chain nodes — Epic 10.2 handlers + Ironlock governance delay. */
const passThroughIronsight = async (state: GraphState) => {
  const idle = await ironsightThrottled(state);
  const cve = await ironsightCvePoll((state.raw_payload ?? {}) as Record<string, unknown>);
  return {
    ...idle,
    agent_logs: [
      `Ironsight (Agent 04): ${cve.cve} blast radius ${cve.blastRadius}.`,
    ],
  };
};
/** Epic 16 / TAS §3 — Ironquery analyst RAG over sovereign raw_payload (post-Ironsight). */
const ironqueryAnalystNode = async (state: GraphState) => {
  const throttle = await ironqueryThrottled(state);
  const raw = (state.raw_payload ?? {}) as Record<string, unknown>;
  const analystInsight = await generateIronqueryAnalystInsight(raw, {
    tenantId: state.tenant_id,
  });

  const throttleLogs = throttle.agent_logs ?? [];
  return {
    ...throttle,
    current_agent: "IRONQUERY",
    agent_logs: [
      ...throttleLogs,
      `Ironquery (Agent 15): Structured query analyzed. Evidence chain registered: ${analystInsight.summarySignature}`,
      `Ironquery disposition [${analystInsight.recommendedAction}]: ${analystInsight.insight}`,
    ],
  };
};
const passThroughIrontally = async (state: GraphState) => {
  const idle = await irontallyThrottled(state);
  const mapping = await irontallyFrameworkMap(
    (state.raw_payload ?? {}) as Record<string, unknown>,
  );
  return {
    ...idle,
    agent_logs: [
      `Irontally (Agent 19): ${mapping.frameworkId} — ${mapping.controls.length} controls mapped.`,
    ],
  };
};

/**
 * TAS §3 — Immutable 19-agent workforce bus (Epic 10): document parse → CVE → RAG → Ironlock/Ironcast egress.
 * Uses Postgres checkpointer when `DATABASE_URL` is configured.
 */
export async function compileSovereignOrchestrationBus() {
  const workflow = new StateGraph(SovereignGraphState)
    .addNode("ironcore_router", async (state: GraphState) => {
      const health = resolveHealthBarPercent(state);
      const threatId = resolveThreatId(state);
      return {
        health_bar_percent: health,
        threat_id: threatId,
        current_agent: "IRONCORE",
        routing_target: "ironscribe",
        status: "PROCESSING" as const,
        agent_logs: [
          "[Agent 1 — Ironcore] Ingress packet evaluated. Routing to document parser layer.",
        ],
      };
    })
    .addNode("ironscribe", async (state: GraphState) => {
      const extracted = await IronScribe.extract(state);
      if (extracted.status === "FAILED") {
        return {
          ...extracted,
          routing_target: "END",
          agent_logs: [
            ...(extracted.agent_logs ?? []),
            "[Agent 5 — Ironscribe] Extraction failed — bus halted.",
          ],
        };
      }
      return {
        ...extracted,
        routing_target: "ironsight",
        agent_logs: [
          ...(extracted.agent_logs ?? []),
          "[Agent 5 — Ironscribe] Ingestion parsing sealed. Extracted framework metrics from structural payloads.",
        ],
      };
    })
    .addNode("ironsight", async (state: GraphState) => {
      const throttle = await ironlockGovernanceDelayIfThrottled(state.tenant_id, "ironsight");
      const cve = await ironsightCvePoll((state.raw_payload ?? {}) as Record<string, unknown>);
      return {
        routing_target: "ironquery",
        current_agent: "IRONSIGHT",
        agent_logs: [
          ...throttle.logs,
          `[Agent 8 — Ironsight] CVE signature matched: ${cve.cve} · blast radius ${cve.blastRadius}.`,
        ],
      };
    })
    .addNode("ironquery", async (state: GraphState) => {
      const throttle = await ironlockGovernanceDelayIfThrottled(state.tenant_id, "ironquery");
      const health = resolveHealthBarPercent(state);
      const raw = (state.raw_payload ?? {}) as Record<string, unknown>;
      const analystInsight = await generateIronqueryAnalystInsight(raw, {
        tenantId: state.tenant_id,
      });
      const needsTriage = healthBarRequiresTriage(health);
      return {
        health_bar_percent: health,
        ironquery_summary_signature: analystInsight.summarySignature,
        current_agent: "IRONQUERY",
        routing_target: needsTriage ? "ironlock" : "ironcast",
        agent_logs: [
          ...throttle.logs,
          `[Agent 15 — Ironquery] RAG analysis complete. Fingerprint [${analystInsight.summarySignature}]. Disposition [${analystInsight.recommendedAction}].`,
        ],
      };
    })
    .addNode("ironlock", async (state: GraphState) => {
      const health = resolveHealthBarPercent(state);
      const threatId = resolveThreatId(state);
      const threadId = resolveThreadId(state, threatId);
      const logs = [
        `[Agent 6 — Ironlock] CRITICAL INTERRUPT: Posture ${health}% below TAS §4.3 threshold. Quarantine path engaged.`,
      ];

      if (healthBarRequiresTriage(health) && process.env.DATABASE_URL?.trim()) {
        try {
          const triage = await evaluateSystemTriage({
            tenantId: state.tenant_id,
            threadId,
            healthBarPercent: health,
            incidentZone: "INFRASTRUCTURE_FAULT",
          });
          if (triage.status === "TRIAGED_AND_HEALED") {
            logs.push(
              `[Agent 12 — Irontech] Freeze sealed checkpoint ${triage.checkpointId.slice(0, 12)}…`,
            );
          }
        } catch (e) {
          logs.push(
            `[Agent 12 — Irontech] Triage skipped: ${e instanceof Error ? e.message : String(e)}`,
          );
        }
      }

      return {
        current_agent: "IRONLOCK",
        routing_target: "ironcast",
        status: "QUARANTINED" as const,
        agent_logs: logs,
      };
    })
    .addNode("ironcast", async (state: GraphState) => {
      const threatId = resolveThreatId(state);
      const traceId = randomUUID();
      const logCount = (state.agent_logs ?? []).length;

      try {
        await auditLogCreateLoose({
          data: {
            action: "ORCHESTRATION_BUS_CYCLE_SUCCESS",
            operatorId: "SYSTEM_ORCHESTRATOR_BUS",
            tenantId: state.tenant_id,
            governance_tenant_uuid: state.tenant_id,
            ...(threatId ? { threatId } : {}),
            justification: `Multi-agent bus cycle completed. ${logCount} specialist log lines. Ironquery fingerprint: ${state.ironquery_summary_signature || "n/a"}.`,
            isSimulation: false,
          },
        });
      } catch (e) {
        console.warn("[sovereign-bus] AuditLog mirror failed:", e);
      }

      const recipient =
        process.env.THREAT_CONFIRMATION_RECIPIENTS?.split(",")[0]?.trim() ||
        process.env.IRONCAST_SMOKE_RECIPIENT?.trim();

      if (recipient && process.env.RESEND_API_KEY?.trim()) {
        try {
          await IroncastService.dispatch({
            tenant_id: state.tenant_id,
            sanitization_status: "VERIFIED_SYSTEM_GENERATED",
            irongate_trace_id: traceId,
            recipient: { email: recipient, role: "SYSTEM_ADMIN" },
            notification: {
              priority: healthBarRequiresTriage(resolveHealthBarPercent(state)) ? "URGENT" : "NOTICE",
              subject: "Ironcast · Sovereign orchestration bus cycle",
              body_summary: `Workforce bus completed for tenant ${state.tenant_id}. ${logCount} agent transitions recorded.`,
            },
            timestamp: BigInt(Math.floor(Date.now() / 1000)),
          });
        } catch (e) {
          console.warn("[sovereign-bus] Ironcast dispatch skipped:", e);
        }
      }

      return {
        current_agent: "END",
        routing_target: "END",
        status: "COMPLETED" as const,
        agent_logs: [
          "[Agent 7 — Ironcast] Batch notifications compiled. Secure endpoints notified when configured.",
        ],
      };
    })
    .addEdge("__start__", "ironcore_router")
    .addEdge("ironcore_router", "ironscribe")
    .addConditionalEdges(
      "ironscribe",
      (state: GraphState) =>
        state.status === "FAILED" || state.routing_target === "END" ? "__end__" : "ironsight",
      {
        ironsight: "ironsight",
        __end__: END,
      },
    )
    .addEdge("ironsight", "ironquery")
    .addConditionalEdges(
      "ironquery",
      (state: GraphState) => {
        if (state.routing_target === "ironlock") return "ironlock";
        if (state.status === "FAILED" || state.routing_target === "END") return "__end__";
        return "ironcast";
      },
      {
        ironlock: "ironlock",
        ironcast: "ironcast",
        __end__: END,
      },
    )
    .addEdge("ironlock", "ironcast")
    .addEdge("ironcast", END);

  const postgresCheckpointer = await getPostgresCheckpointer();
  return workflow.compile({ checkpointer: postgresCheckpointer });
}

export async function createSovereignGraph() {
  const workflow = new StateGraph(SovereignGraphState)
    .addNode("ironcore", IronCore.route)
    .addNode("ironbloom", Ironbloom.scoreCarbonRisk)
    .addNode("ironscribe", IronScribe.extract)
    .addNode("warden", TheWarden.validate)
    .addNode("irontrust", IronTrust.analyzeRisk)
    .addNode("ironsight", passThroughIronsight)
    .addNode("ironquery", ironqueryAnalystNode)
    .addNode("irontally", passThroughIrontally)

    .addEdge("__start__", "ironcore");

  // Multi-Node Conditional Routing
  workflow.addConditionalEdges(
    "ironcore",
    (state) => state.current_agent,
    {
      IRONSCRIBE: "ironscribe",
      IRONTRUST: "irontrust",
      IRONBLOOM: "ironbloom",
      IRONGATE: "ironcore", // Loop back for re-sanitization if needed
      END: END,
    },
  );

  workflow.addEdge("ironbloom", "irontrust");

  // Sequential Specialist Edges (new placeholders are registered in-chain for future wiring)
  workflow.addEdge("ironscribe", "warden");
  workflow.addEdge("warden", "irontrust");
  workflow.addEdge("irontrust", "ironsight");
  workflow.addEdge("ironsight", "ironquery");
  workflow.addEdge("ironquery", "irontally");
  workflow.addEdge("irontally", END);

  const postgresCheckpointer = await getPostgresCheckpointer();
  return workflow.compile({ checkpointer: postgresCheckpointer });
}

export { executeAutonomousStateFreeze, getPostgresCheckpointer } from "./checkpointer";
