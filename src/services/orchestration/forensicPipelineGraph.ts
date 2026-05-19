/**
 * TAS Section 3 — 19-Agent Workforce (Epic 10.2 / 10.3)
 * Irongate → Ironcore router → specialists → Irontrust → persist → END
 */
import { StateGraph, END } from "@langchain/langgraph";
import { irongateSanitize } from "@/src/services/agents/irongateSanitize";
import { ironsightCvePoll } from "@/src/services/agents/ironsight";
import { irontallyFrameworkMap } from "@/src/services/agents/irontally";
import { ironbloomTelemetry } from "@/src/services/agents/ironbloom";
import { irontrustMathEngine } from "@/src/services/irontrust/mathEngine";
import { persistForensicState } from "@/app/lib/riskRegistryDb";
import { buildIronscribeForensicAuditMarkdown } from "@/app/services/ironscribe/forensicAuditBlock";
import { getPostgresCheckpointer } from "./checkpointer";
import {
  sanitizedPayloadRequestsFaultInjection,
  throwForensicTransactionAborted,
} from "./forensicFaultInjection";
import { ForensicGraphState } from "./forensicState";
import type { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";

type GraphState = typeof ForensicGraphState.State;

function buildInitialRawPayload(state: GraphState): unknown {
  if (state.tenantId && Object.keys(state.rawPayload).length > 0) {
    return {
      tenant_id: state.tenantId,
      tenantId: state.tenantId,
      source_type: "API",
      raw_data: state.rawPayload,
      ...state.rawPayload,
    };
  }
  return state.rawPayload;
}

export type CompileOrchestrationGraphOptions = {
  /** Epic 15 — persist checkpoints in Postgres (tenant-bound `thread_id`). */
  checkpointer?: PostgresSaver;
};

export async function compileOrchestrationGraphWithCheckpoint() {
  const postgresCheckpointer = await getPostgresCheckpointer();
  return compileOrchestrationGraph({ checkpointer: postgresCheckpointer });
}

/** Epic 15 — PostgresSaver singleton for validation / fault-injection tests. */
export async function postgresCheckpointer(): Promise<PostgresSaver> {
  return getPostgresCheckpointer();
}

export function compileOrchestrationGraph(options?: CompileOrchestrationGraphOptions) {
  const workflow = new StateGraph(ForensicGraphState)
    .addNode("irongate", async (state) => {
      const sanitized = await irongateSanitize(buildInitialRawPayload(state));
      if (!sanitized.tenantId) {
        throw new Error("CRITICAL_SECURITY_VIOLATION: Missing Tenant Stamp");
      }

      return {
        sanitizedPayload: sanitized,
        tenantId: sanitized.tenantId,
        currentAssignee: "Agent_14_Irongate",
        routingTarget: "ironcore",
        historyLogs: [
          {
            agentId: "Irontech (Agent 14)",
            timestamp: new Date().toISOString(),
            message: "Sensing & Sanitization complete. Tenant ID strictly stamped.",
          },
        ],
      };
    })
    .addNode("ironcore", async (state) => {
      let target = "ironsight";
      const payloadStr = JSON.stringify(state.sanitizedPayload).toLowerCase();

      if (
        payloadStr.includes("carbon") ||
        payloadStr.includes("kwh") ||
        payloadStr.includes("sustainability")
      ) {
        target = "ironbloom";
      } else if (
        payloadStr.includes("cve") ||
        payloadStr.includes("vulnerability") ||
        payloadStr.includes("exploit")
      ) {
        target = "ironsight";
      } else if (
        payloadStr.includes("csrd") ||
        payloadStr.includes("soc2") ||
        payloadStr.includes("compliance")
      ) {
        target = "irontally";
      }

      return {
        currentAssignee: "Agent_01_Ironcore",
        routingTarget: target,
        historyLogs: [
          {
            agentId: "Ironcore (Agent 01)",
            timestamp: new Date().toISOString(),
            message: `Ironcore routed forensic payload to ${target}.`,
          },
        ],
      };
    })
    .addNode("ironbloom", async (state) => {
      const metric = await ironbloomTelemetry(state.sanitizedPayload);
      return {
        currentAssignee: "Agent_18_Ironbloom",
        routingTarget: "irontrust",
        historyLogs: [
          {
            agentId: "Ironbloom (Agent 18)",
            timestamp: new Date().toISOString(),
            message: `Physical data captured: ${metric.value} ${metric.unit}. Routing to Irontrust.`,
          },
        ],
      };
    })
    .addNode("ironsight", async (state) => {
      const cveData = await ironsightCvePoll(state.sanitizedPayload);
      return {
        currentAssignee: "Agent_04_Ironsight",
        routingTarget: "irontrust",
        historyLogs: [
          {
            agentId: "Ironsight (Agent 04)",
            timestamp: new Date().toISOString(),
            message: `Vulnerability verified. Blast radius cataloged: ${cveData.cve}.`,
          },
        ],
      };
    })
    .addNode("irontally", async (state) => {
      const mapping = await irontallyFrameworkMap(state.sanitizedPayload);
      return {
        currentAssignee: "Agent_19_Irontally",
        routingTarget: "irontrust",
        complianceBadges: mapping.controls,
        historyLogs: [
          {
            agentId: "Irontally (Agent 19)",
            timestamp: new Date().toISOString(),
            message: `Framework mapped: ${mapping.frameworkId} controls active.`,
          },
        ],
      };
    })
    .addNode("irontrust", async (state) => {
      if (sanitizedPayloadRequestsFaultInjection(state.sanitizedPayload)) {
        throwForensicTransactionAborted("Irontrust");
      }
      const valuation = await irontrustMathEngine(
        state.sanitizedPayload,
        state.complianceBadges,
      );
      return {
        currentAssignee: "Agent_03_Irontrust",
        financialImpactCents: valuation.mitigatedValueCents.toString(),
        routingTarget: "persist",
        historyLogs: [
          {
            agentId: "Irontrust (Agent 03)",
            timestamp: new Date().toISOString(),
            message: `Valuation sealed: ${valuation.mitigatedValueCents.toString()} cents mitigated.`,
          },
        ],
      };
    })
    .addNode("persist", async (state) => {
      const auditTimestamp = new Date().toISOString();
      const markdownAuditBlock = buildIronscribeForensicAuditMarkdown({
        threatId: state.threatId,
        tenantId: state.tenantId,
        financialImpactCents: state.financialImpactCents || "0",
        historyLogs: state.historyLogs,
        complianceBadges: state.complianceBadges,
        auditTimestamp,
      });

      await persistForensicState({
        threatId: state.threatId,
        tenantId: state.tenantId,
        status: "ACTIVE",
        currentAssignee: state.currentAssignee,
        financialImpactCents: BigInt(state.financialImpactCents || "0"),
        history: state.historyLogs,
        rawAuditMarkdown: markdownAuditBlock,
      });

      return { currentAssignee: null };
    });

  workflow.addEdge("__start__", "irongate");
  workflow.addEdge("irongate", "ironcore");

  workflow.addConditionalEdges("ironcore", (state) => state.routingTarget, {
    ironbloom: "ironbloom",
    ironsight: "ironsight",
    irontally: "irontally",
    irontrust: "irontrust",
  });

  workflow.addEdge("ironbloom", "irontrust");
  workflow.addEdge("ironsight", "irontrust");
  workflow.addEdge("irontally", "irontrust");
  workflow.addEdge("irontrust", "persist");
  workflow.addEdge("persist", END);

  if (options?.checkpointer) {
    return workflow.compile({ checkpointer: options.checkpointer });
  }
  return workflow.compile();
}
