import { Annotation } from "@langchain/langgraph";

export type ForensicHistoryEntry = {
  agentId: string;
  timestamp: string;
  message: string;
};

/**
 * Epic 10.2/10.3 — 19-agent workforce forensic pipeline state (tenant-isolated).
 */
export const ForensicGraphState = Annotation.Root({
  threatId: Annotation<string>({
    reducer: (x, y) => y ?? x,
    default: () => "",
  }),
  tenantId: Annotation<string>({
    reducer: (x, y) => y ?? x,
    default: () => "",
  }),
  rawPayload: Annotation<Record<string, unknown>>({
    reducer: (x, y) => y ?? x,
    default: () => ({}),
  }),
  sanitizedPayload: Annotation<Record<string, unknown>>({
    reducer: (x, y) => y ?? x,
    default: () => ({}),
  }),
  currentAssignee: Annotation<string | null>({
    reducer: (x, y) => (y !== undefined ? y : x),
    default: () => null,
  }),
  routingTarget: Annotation<string>({
    reducer: (x, y) => y ?? x,
    default: () => "ironsight",
  }),
  /** BIGINT cents as decimal string (LangGraph JSON-safe). */
  financialImpactCents: Annotation<string>({
    reducer: (x, y) => y ?? x,
    default: () => "0",
  }),
  complianceBadges: Annotation<string[]>({
    reducer: (x, y) => [...new Set([...(x ?? []), ...(y ?? [])])],
    default: () => [],
  }),
  historyLogs: Annotation<ForensicHistoryEntry[]>({
    reducer: (x, y) => (x ?? []).concat(y ?? []),
    default: () => [],
  }),
});
