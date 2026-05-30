import { Annotation } from "@langchain/langgraph";

export type ForensicHistoryEntry = {
  agentId: string;
  timestamp: string;
  message: string;
};

/** Epic 10 integration contract — DMZ perimeter audit trail (Irongate-first). */
export type ForensicPerimeterHistoryEntry = {
  agent: string;
  status: string;
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
  /** Integration ingress envelope (`graph.invoke({ payload })`). */
  payload: Annotation<Record<string, unknown>>({
    reducer: (x, y) => ({ ...(x ?? {}), ...(y ?? {}) }),
    default: () => ({}),
  }),
  /** DMZ perimeter history (`graph.invoke({ history })`). */
  history: Annotation<ForensicPerimeterHistoryEntry[]>({
    reducer: (x, y) => (x ?? []).concat(y ?? []),
    default: () => [],
  }),
  sanitizationStamp: Annotation<boolean>({
    reducer: (x, y) => y ?? x,
    default: () => false,
  }),
  /** Epic 10 — Ironintel (Index 11) OSINT envelope applied before Irongate DMZ. */
  osintEnveloped: Annotation<boolean>({
    reducer: (x, y) => y ?? x,
    default: () => false,
  }),
  /** Agent 09 — deterministic PostgreSQL RLS statements (no raw payload interpolation). */
  rlsPolicyStatements: Annotation<string[]>({
    reducer: (x, y) => (y != null && y.length > 0 ? y : x ?? []),
    default: () => [],
  }),
  /** Agent 19 — resolved framework id from Irontally matrix translation. */
  complianceFrameworkId: Annotation<string>({
    reducer: (x, y) => y ?? x,
    default: () => "",
  }),
});
