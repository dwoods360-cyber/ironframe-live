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

const DEFAULT_LOCAL_IRONBOARD_URL = "http://127.0.0.1:8082";

/**
 * Public Cloud Run engine for this project. Used when Vercel Production has an
 * empty/loopback OPERATIONS_IRONBOARD_URL (GitHub secrets are not auto-synced to Vercel).
 * Override with IRONBOARD_CLOUD_RUN_URL if the service URL changes.
 */
const PRODUCTION_IRONBOARD_CLOUD_RUN_URL =
  "https://ironframe-ironboard-4qpposvc7q-uc.a.run.app";

function isLoopbackHttpUrl(raw: string): boolean {
  try {
    const host = new URL(raw).hostname;
    return host === "127.0.0.1" || host === "localhost" || host === "::1";
  } catch {
    return true;
  }
}

export function resolveIronboardBaseUrl(): string {
  const fromEnv =
    process.env.OPERATIONS_IRONBOARD_URL?.trim() ||
    process.env.IRONBOARD_URL?.trim() ||
    process.env.NEXT_PUBLIC_IRONBOARD_URL?.trim() ||
    "";
  const cleaned = fromEnv.replace(/\/$/, "");
  const cloudFallback =
    process.env.IRONBOARD_CLOUD_RUN_URL?.trim().replace(/\/$/, "") ||
    PRODUCTION_IRONBOARD_CLOUD_RUN_URL;

  if (cleaned && !isLoopbackHttpUrl(cleaned)) {
    return cleaned;
  }

  // On Vercel, never probe 127.0.0.1 — empty secrets previously left the ops
  // portal stuck on the offline panel while Cloud Run was healthy.
  if (process.env.VERCEL) {
    if (cleaned) {
      console.warn(
        "[ironboard] OPERATIONS_IRONBOARD_URL is loopback on Vercel; using Cloud Run fallback",
      );
    } else {
      console.warn(
        "[ironboard] OPERATIONS_IRONBOARD_URL unset on Vercel; using Cloud Run fallback",
      );
    }
    return cloudFallback;
  }

  return cleaned || DEFAULT_LOCAL_IRONBOARD_URL;
}

export function ironboardQueryEndpoint(): string {
  return `${resolveIronboardBaseUrl()}/api/query`;
}
