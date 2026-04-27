import { SovereignGraphState } from '../orchestration/state';
import { saveCheckpoint } from '@/app/utils/irontechResilience';
import prisma from '@/lib/prisma';

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

    const type = state.raw_payload?.type;
    let nextStep = "END"; // Default to termination

    if (type === "FINANCIAL_AUDIT") {
      nextStep = "IRONTRUST"; // Agent 3
    } else if (type === "DOCUMENT_ANALYSIS") {
      nextStep = "IRONSCRIBE"; // Agent 5
    } else {
      nextStep = "IRONGATE"; // Agent 14 (Sanitization)
    }

    const result = {
      current_agent: nextStep,
      agent_logs: [`Ironcore routed payload type [${type}] to ${nextStep}`],
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
