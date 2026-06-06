import { Annotation } from "@langchain/langgraph";

/** Expandable product portfolio entry tracked across board deliberations. */
export interface ProductAsset {
  id: string;
  name: string;
  type: string;
  currentStatus: string;
}

/** Domain board state — financial fields use whole-integer cents (BigInt at runtime). */
export interface BoardState {
  products: ProductAsset[];
  activeTargetProductId: string;
  businessObjective: string;
  financialProjectionsCents: bigint;
  legalReviewCleared: boolean;
  executiveSummaryLog: string[];
}

/**
 * LangGraph annotation layer — cents serialized as digit strings for JSON-safe graph I/O.
 * No connection to ironframe-live Postgres; in-memory / CLI execution only.
 */
export const BoardStateAnnotation = Annotation.Root({
  products: Annotation<ProductAsset[]>({
    reducer: (x: ProductAsset[], y: ProductAsset[]) => (y?.length ? y : x ?? []),
    default: () => [],
  }),

  activeTargetProductId: Annotation<string>({
    reducer: (x: string, y: string) => y ?? x,
    default: () => "",
  }),

  businessObjective: Annotation<string>({
    reducer: (x: string, y: string) => y ?? x,
    default: () => "",
  }),

  financialProjectionsCents: Annotation<string>({
    reducer: (x: string, y: string) => y ?? x,
    default: () => "0",
  }),

  legalReviewCleared: Annotation<boolean>({
    reducer: (x: boolean, y: boolean) => y ?? x,
    default: () => false,
  }),

  executiveSummaryLog: Annotation<string[]>({
    reducer: (x: string[], y: string[]) => (x ?? []).concat(y ?? []),
    default: () => [],
  }),

  /** Round-robin speaker key (graph orchestration only). */
  activeSpeaker: Annotation<string>({
    reducer: (x: string, y: string) => y ?? x,
    default: () => "CEO",
  }),

  departmentalApprovals: Annotation<string[]>({
    reducer: (x: string[], y: string[]) => [...new Set([...(x ?? []), ...(y ?? [])])],
    default: () => [],
  }),

  /** Documentation paths written by Trainer / Writer after content-firewall clearance. */
  documentationArtifacts: Annotation<string[]>({
    reducer: (x: string[], y: string[]) => [...new Set([...(x ?? []), ...(y ?? [])])],
    default: () => [],
  }),
});

export type BoardGraphState = typeof BoardStateAnnotation.State;

/** Map graph string cents to BigInt for domain consumers. */
export function graphStateToBoardState(graph: BoardGraphState): BoardState {
  return {
    products: graph.products,
    activeTargetProductId: graph.activeTargetProductId,
    businessObjective: graph.businessObjective,
    financialProjectionsCents: BigInt(graph.financialProjectionsCents),
    legalReviewCleared: graph.legalReviewCleared,
    executiveSummaryLog: graph.executiveSummaryLog,
  };
}
