import { NextRequest } from "next/server";

import { requirePlatformAdministrator } from "@/app/lib/auth/platformAdminAccess";
import {
  IRONBOARD_BOARDROOM_PLANE,
  X_CONVERSATION_PLANE,
  ironboardQueryEndpoint,
  mustBypassIronframeCore,
  resolveConversationPlane,
} from "@/app/lib/conversationPlaneGateway";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Root gateway entry: forces Boardroom plane traffic to isolated IronBoard (:8082).
 * Never synthesizes locally — streams from IronBoard discovery + tool loop.
 */
export async function POST(request: NextRequest) {
  const auth = await requirePlatformAdministrator();
  if ("error" in auth) {
    return new Response(JSON.stringify({ error: auth.error }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  const bodyText = await request.text();
  let parsed: Record<string, unknown> = {};
  try {
    parsed = bodyText ? (JSON.parse(bodyText) as Record<string, unknown>) : {};
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const history = parsed.history;
  const lastUser =
    Array.isArray(history) && history.length
      ? String((history[history.length - 1] as { content?: string })?.content ?? "")
      : "";

  const plane = resolveConversationPlane({
    headerPlane: request.headers.get(X_CONVERSATION_PLANE),
    referer: request.headers.get("referer"),
    pathname: request.nextUrl.pathname,
    query: lastUser,
  });

  if (!mustBypassIronframeCore(plane)) {
    return new Response(
      JSON.stringify({
        error:
          "This endpoint is reserved for the IronBoard 17-agent boardroom plane. GRC core queries use sovereign orchestration APIs.",
      }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const upstream = await fetch(ironboardQueryEndpoint(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      [X_CONVERSATION_PLANE]: IRONBOARD_BOARDROOM_PLANE,
    },
    body: bodyText,
  });

  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      "Content-Type": upstream.headers.get("Content-Type") ?? "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      [X_CONVERSATION_PLANE]: IRONBOARD_BOARDROOM_PLANE,
    },
  });
}
