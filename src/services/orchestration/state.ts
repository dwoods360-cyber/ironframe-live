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
});
