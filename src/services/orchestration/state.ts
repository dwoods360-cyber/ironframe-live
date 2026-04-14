import { Annotation } from "@langchain/langgraph";

/**
 * SOVEREIGN LANGGRAPH STATE
 * Mandate: UUID (tenant_id) and BIGINT (financials) must be preserved in state.
 */
export type UnifiedRiskStateItem = {
  id: string;
  correlationId: string | null;
  title: string;
  source: string;
  status: string;
  isSimulation: boolean;
  financialRisk_cents: string | null;
  metadata: Record<string, unknown> | null;
  updatedAt: string;
};

export const SovereignGraphState = Annotation.Root({
  // Multi-Tenant Isolation (Mandatory UUID)
  tenant_id: Annotation<string>({
    reducer: (x: string, y: string) => y ?? x,
    default: () => "00000000-0000-0000-0000-000000000000",
  }),

  // Data Payload (The raw input)
  raw_payload: Annotation<any>({
    reducer: (x: any, y: any) => y ?? x,
    default: () => ({}),
  }),

  // Internal Routing & Logging
  current_agent: Annotation<string>({
    reducer: (x: string, y: string) => y ?? x,
    default: () => "IRONCORE",
  }),
  agent_logs: Annotation<string[]>({
    reducer: (x: string[], y: string[]) => x.concat(y),
    default: () => [],
  }),
  processed_agents: Annotation<string[]>({
    reducer: (x: string[], y: string[]) => {
      const merged = new Set<string>([...x, ...y]);
      return Array.from(merged);
    },
    default: () => [],
  }),

  // Workflow Status
  status: Annotation<'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'QUARANTINED'>({
    reducer: (x: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'QUARANTINED', y: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'QUARANTINED') => y ?? x,
    default: () => "PENDING",
  }),

  // Explicit path segregation for simulation vs production write controls.
  data_path: Annotation<"SIMULATION" | "PRODUCTION">({
    reducer: (x: "SIMULATION" | "PRODUCTION", y: "SIMULATION" | "PRODUCTION") => y ?? x,
    default: () => "PRODUCTION",
  }),
  ledger_blocked: Annotation<boolean>({
    reducer: (x: boolean, y: boolean) => y ?? x,
    default: () => false,
  }),

  // Unified risk ledger consumed by Noon-era unified UI loop.
  unified_risks: Annotation<UnifiedRiskStateItem[]>({
    reducer: (x: UnifiedRiskStateItem[], y: UnifiedRiskStateItem[]) => y ?? x,
    default: () => [],
  }),

  // Sanitized metadata only; never store raw PII in graph state.
  sanitized_metadata: Annotation<Record<string, unknown>>({
    reducer: (x: Record<string, unknown>, y: Record<string, unknown>) => ({ ...x, ...(y ?? {}) }),
    default: () => ({}),
  }),
});
