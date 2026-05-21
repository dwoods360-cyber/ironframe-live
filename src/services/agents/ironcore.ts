import { SovereignGraphState } from '../orchestration/state';
import { saveCheckpoint } from '@/app/utils/irontechResilience';
import prisma from '@/lib/prisma';
import { getSustainabilityApiDegradedAsync } from "@/src/services/ironlock/validationRules";
import {
  electricityMapsStatusFromDegradedFlag,
  resolveTaskLanes,
} from "../ironmap/criticalPath";
import { isConstitutionalEmergencyActive } from "../irontech/autonomousDecoupling";

/** Injected by `routeToAgents` for AgentReasoning metadata (stripped before routing logic). */
const TRACE_PAYLOAD_KEY = '__ironframe_trace_id';

export type IroncoreRouteToAgentsInput = {
  tenantId: string;
  sanitizedPayload: Record<string, unknown>;
  traceId: string;
};

export class IronCore {
  /**
   * ROUTING LOGIC: Analyzes the payload and directs traffic.
   * Note: This is a pure logic node, no LLM call required for basic routing.
   */
  static async route(state: typeof SovereignGraphState.State): Promise<Partial<typeof SovereignGraphState.State>> {
    const threatId = state.raw_payload?.threat_id ?? state.raw_payload?.threatId;
    const highRiskMitigation = state.raw_payload?.highRiskMitigation === true;
    if (typeof threatId === 'string' && threatId.trim() && highRiskMitigation) {
      try {
        await saveCheckpoint('Ironcore', threatId.trim(), {
          tenant_id: state.tenant_id,
          payload_type: state.raw_payload?.type,
          current_agent: state.current_agent,
        });
      } catch (e) {
        console.warn('[Ironcore] Pre-execution checkpoint skipped:', e);
      }
    }

    const raw = state.raw_payload as Record<string, unknown> | undefined;
    const type = raw?.type;
    let nextStep = "END"; // Default to termination
    const decoupleLogs: string[] = [];

    const blocked = state.irontech_blocked_paths ?? [];
    if (
      type === "SUSTAINABILITY_ESG" ||
      type === "ESG_INGEST" ||
      type === "CARBON_AUDIT" ||
      raw?.requires_physical_units === true
    ) {
      nextStep = "IRONBLOOM"; // Agent 18
    } else if (type === "FINANCIAL_AUDIT") {
      nextStep = "IRONTRUST"; // Agent 3
    } else if (type === "DOCUMENT_ANALYSIS") {
      nextStep = "IRONSCRIBE"; // Agent 5
    } else {
      nextStep = "IRONGATE"; // Agent 14 (Sanitization)
    }

    const carbonDown = await getSustainabilityApiDegradedAsync();
    const emStatus = electricityMapsStatusFromDegradedFlag(carbonDown);
    const lanes = resolveTaskLanes(emStatus);

    if (blocked.includes("ironbloom") && nextStep === "IRONBLOOM") {
      nextStep = "IRONTRUST";
      decoupleLogs.push("IRONTECH_STICKY_BYPASS:blocked_path_ironbloom→IRONTRUST");
    }

    if (carbonDown && nextStep === "IRONBLOOM") {
      const allowRegulatoryParallel =
        raw?.ironmap_regulatory_parallel === true ||
        raw?.regulatory_framework_only === true ||
        type === "FINANCIAL_AUDIT";

      const carbonExclusivePayload =
        type === "CARBON_AUDIT" ||
        type === "SUSTAINABILITY_ESG" ||
        type === "ESG_INGEST" ||
        raw?.requires_physical_units === true;

      const carbonOnly = carbonExclusivePayload && !allowRegulatoryParallel;

      if (!carbonOnly) {
        nextStep = "IRONTRUST";
        decoupleLogs.push(
          `IRONMAP_DECOUPLE: ElectricityMaps=${emStatus}; Sustainability_Mapping=${lanes.Sustainability_Mapping}; Regulatory_Framework_Mapping=${lanes.Regulatory_Framework_Mapping}; partial state → IRONTRUST (parallel regulatory path)`,
        );
      } else {
        decoupleLogs.push(
          `IRONMAP: ElectricityMaps=${emStatus}; Sustainability_Mapping=${lanes.Sustainability_Mapping}; carbon-exclusive payload — IRONBLOOM retained pending live feed or explicit waiver`,
        );
      }
    }

    if (isConstitutionalEmergencyActive() && nextStep === "IRONBLOOM") {
      nextStep = "END";
      decoupleLogs.push(
        "IRONTECH:constitutional_emergency_gate — autonomous IRONBLOOM routing suspended (>3 distinct agents in concurrent window)",
      );
    }

    const result = {
      current_agent: nextStep,
      agent_logs: [
        ...decoupleLogs,
        `Ironcore routed payload type [${type}] to ${nextStep}`,
      ],
      status: "PROCESSING" as const,
    };

    await IronCore.persistAgentReasoningAfterRoute({
      tenantId: state.tenant_id,
      rawPayload: state.raw_payload as Record<string, unknown>,
      routed: result,
    });

    return result;
  }

  private static readonly IRONCORE_AGENT_ID = "IRONCORE";

  private static async persistAgentReasoningAfterRoute(args: {
    tenantId: string;
    rawPayload: Record<string, unknown>;
    routed: {
      current_agent?: string;
      agent_logs?: string[];
      status?: string;
    };
  }): Promise<void> {
    const raw = args.rawPayload;
    const tid =
      typeof raw.threat_id === "string"
        ? raw.threat_id.trim()
        : typeof raw.threatId === "string"
          ? raw.threatId.trim()
          : "";
    if (!tid) return;

    try {
      const exists = await prisma.threatEvent.findUnique({
        where: { id: tid },
        select: { id: true },
      });
      if (!exists) return;

      const traceFromPayload =
        typeof raw[TRACE_PAYLOAD_KEY] === "string"
          ? (raw[TRACE_PAYLOAD_KEY] as string).trim()
          : undefined;

      const reasoning =
        args.routed.agent_logs?.join("\n") ??
        `Ironcore routed to ${args.routed.current_agent ?? "UNKNOWN"}`;

      const metadata = {
        tenant_id: args.tenantId,
        trace_id: traceFromPayload ?? null,
        routed_to: args.routed.current_agent ?? null,
        orchestration_status: args.routed.status ?? null,
        payload_type: raw.type ?? null,
      };

      await prisma.agentReasoning.upsert({
        where: {
          agentId_threatId: {
            agentId: IronCore.IRONCORE_AGENT_ID,
            threatId: tid,
          },
        },
        create: {
          agentId: IronCore.IRONCORE_AGENT_ID,
          threatId: tid,
          reasoning,
          metadata,
        },
        update: {
          reasoning,
          metadata,
        },
      });
    } catch (e) {
      console.warn("[Ironcore] AgentReasoning persistence skipped:", e);
    }
  }

  /**
   * Agent 1 (Ironcore): canonical handoff after Irongate CLEAN — builds sovereign state and runs routing.
   */
  static async routeToAgents(input: IroncoreRouteToAgentsInput): Promise<
    Awaited<ReturnType<typeof IronCore.route>> & {
      trace_id: string;
      tenant_id: string;
    }
  > {
    const state = {
      tenant_id: input.tenantId,
      raw_payload: {
        ...input.sanitizedPayload,
        [TRACE_PAYLOAD_KEY]: input.traceId,
      },
      current_agent: "IRONCORE",
      agent_logs: [] as string[],
      status: "PENDING" as const,
    };
    const routed = await this.route(state as Parameters<typeof IronCore.route>[0]);
    return {
      ...routed,
      trace_id: input.traceId,
      tenant_id: input.tenantId,
    };
  }
}
