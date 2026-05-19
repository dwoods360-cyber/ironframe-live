import { Annotation } from "@langchain/langgraph";

/**
 * SOVEREIGN LANGGRAPH STATE
 * Mandate: UUID (tenant_id) and BIGINT (financials) must be preserved in state.
 */
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

  // Workflow Status
  status: Annotation<'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'QUARANTINED'>({
    reducer: (x: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'QUARANTINED', y: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'QUARANTINED') => y ?? x,
    default: () => "PENDING",
  }),

  /** BIGINT cents (decimal string) — financial ALE baseline / exposure. */
  financial_ale_cents: Annotation<string>({
    reducer: (_x: string, y: string) => y ?? _x,
    default: () => "0",
  }),

  /** BIGINT cents (decimal string) — Sustainability ALE_carbon (Agent 18). */
  sustainability_ale_cents: Annotation<string>({
    reducer: (_x: string, y: string) => y ?? _x,
    default: () => "0",
  }),

  /** BIGINT cents (decimal string) — canonical mitigated value column target. */
  mitigated_value_cents: Annotation<string>({
    reducer: (_x: string, y: string) => y ?? _x,
    default: () => "0",
  }),

  carbon_intensity_gco2: Annotation<number>({
    reducer: (_x: number, y: number) => y ?? _x,
    default: () => 0,
  }),

  /** Irontech (Agent 12): LangGraph nodes whose primary dependency path is BLOCK_AND_BYPASS (Tier 1). */
  irontech_blocked_paths: Annotation<string[]>({
    reducer: (x, y) => {
      const a = x ?? [];
      const b = y ?? [];
      return [...new Set([...a, ...b])];
    },
    default: () => [],
  }),
});
