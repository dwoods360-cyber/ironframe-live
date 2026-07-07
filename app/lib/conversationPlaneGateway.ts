/**
 * Root gateway: Boardroom (17-agent IronBoard) vs Ironframe GRC core (19-agent workforce).
 * Board-level CRM / sales / playbook questions must never enter the Frame orchestration bus.
 */

import {
  IRONBOARD_ENDPOINTS,
  IRONBOARD_PORT,
  IRONFRAME_ENDPOINTS,
  IRONFRAME_PORT,
  ZERO_CROSS_CONTAMINATION_DIRECTIVE,
  isIronboardEndpoint,
  isIronframeEndpoint,
  resolveApplicationContext,
} from "@/lib/platformApplicationBoundary";

export {
  IRONBOARD_ENDPOINTS,
  IRONBOARD_PORT,
  IRONFRAME_ENDPOINTS,
  IRONFRAME_PORT,
  ZERO_CROSS_CONTAMINATION_DIRECTIVE,
  isIronboardEndpoint,
  isIronframeEndpoint,
  resolveApplicationContext,
};

export const X_CONVERSATION_PLANE = "x-ironframe-conversation-plane";

export const IRONBOARD_BOARDROOM_PLANE = "ironboard-boardroom" as const;
export const IRONFRAME_GRC_PLANE = "ironframe-grc-core" as const;

export type ConversationPlane = typeof IRONBOARD_BOARDROOM_PLANE | typeof IRONFRAME_GRC_PLANE;

const BOARDROOM_QUERY_TERMS = [
  "crm",
  "sales playbook",
  "playbook",
  "deal pipeline",
  "contact database",
  "managecrmpipeline",
  "knowledge base",
  "ironboard",
  "boardroom",
  "board agent",
  "17-agent",
] as const;

/** Resolve which conversational plane owns this request. */
export function resolveConversationPlane(input: {
  headerPlane?: string | null;
  referer?: string | null;
  pathname?: string | null;
  query?: string | null;
}): ConversationPlane {
  const header = String(input.headerPlane ?? "")
    .trim()
    .toLowerCase();
  if (header === IRONBOARD_BOARDROOM_PLANE) return IRONBOARD_BOARDROOM_PLANE;
  if (header === IRONFRAME_GRC_PLANE) return IRONFRAME_GRC_PLANE;

  const referer = String(input.referer ?? "").toLowerCase();
  if (referer.includes(":8082") || referer.includes("/ironboard") || referer.includes("boardroom")) {
    return IRONBOARD_BOARDROOM_PLANE;
  }

  const pathname = String(input.pathname ?? "").toLowerCase();
  if (pathname.startsWith("/api/boardroom") || pathname.includes("ironboard")) {
    return IRONBOARD_BOARDROOM_PLANE;
  }
  if (isIronboardEndpoint(pathname)) {
    return IRONBOARD_BOARDROOM_PLANE;
  }
  if (isIronframeEndpoint(pathname)) {
    return IRONFRAME_GRC_PLANE;
  }

  const q = String(input.query ?? "").toLowerCase();
  if (BOARDROOM_QUERY_TERMS.some(term => q.includes(term))) {
    return IRONBOARD_BOARDROOM_PLANE;
  }

  return IRONFRAME_GRC_PLANE;
}

/** Boardroom interface traffic must bypass the 19-agent Frame orchestration bus. */
export function mustBypassIronframeCore(plane: ConversationPlane): boolean {
  return plane === IRONBOARD_BOARDROOM_PLANE;
}

export function resolveIronboardBaseUrl(): string {
  const fromEnv =
    process.env.OPERATIONS_IRONBOARD_URL?.trim() ||
    process.env.IRONBOARD_URL?.trim() ||
    process.env.NEXT_PUBLIC_IRONBOARD_URL?.trim() ||
    "";
  return fromEnv.replace(/\/$/, "") || "http://127.0.0.1:8082";
}

export function ironboardQueryEndpoint(): string {
  return `${resolveIronboardBaseUrl()}/api/query`;
}
