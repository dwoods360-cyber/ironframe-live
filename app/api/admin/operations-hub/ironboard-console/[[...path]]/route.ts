import { NextRequest, NextResponse } from "next/server";

import { requirePerimeterWorkforceOperator } from "@/app/lib/auth/perimeterWorkforceAccess";
import { IRONBOARD_BOARDROOM_PLANE, X_CONVERSATION_PLANE } from "@/app/lib/conversationPlaneGateway";
import {
  injectIronboardConsoleBaseHref,
  ironboardConsoleProxyPath,
  resolveIronboardUpstreamUrl,
} from "@/app/lib/server/ironboardConsoleProxy";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = { params: Promise<{ path?: string[] }> };

async function proxyIronboardConsole(request: NextRequest, pathSegments: string[] | undefined) {
  const auth = await requirePerimeterWorkforceOperator();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: 403 });
  }

  const subpath = pathSegments?.length ? `/${pathSegments.join("/")}` : "/";
  const upstreamUrl = resolveIronboardUpstreamUrl(subpath, request.nextUrl.search);

  const headers = new Headers();
  const contentType = request.headers.get("content-type");
  if (contentType) headers.set("content-type", contentType);
  headers.set(X_CONVERSATION_PLANE, IRONBOARD_BOARDROOM_PLANE);
  headers.set("accept", request.headers.get("accept") ?? "*/*");
  // Forward operator session cookies so boardroom core-telemetry inherits tenant scope.
  const cookie = request.headers.get("cookie");
  if (cookie) headers.set("cookie", cookie);

  const init: RequestInit = {
    method: request.method,
    headers,
    cache: "no-store",
  };

  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = await request.arrayBuffer();
  }

  const upstream = await fetch(upstreamUrl, init);
  const responseContentType = upstream.headers.get("content-type") ?? "application/octet-stream";

  if (responseContentType.includes("text/html") && subpath === "/") {
    const html = injectIronboardConsoleBaseHref(
      await upstream.text(),
      ironboardConsoleProxyPath(),
    );
    return new NextResponse(html, {
      status: upstream.status,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-cache, must-revalidate",
      },
    });
  }

  if (responseContentType.includes("text/event-stream")) {
    return new NextResponse(upstream.body, {
      status: upstream.status,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  }

  const passthroughHeaders = new Headers();
  passthroughHeaders.set("Content-Type", responseContentType);
  const cacheControl = upstream.headers.get("cache-control");
  if (cacheControl) passthroughHeaders.set("Cache-Control", cacheControl);

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers: passthroughHeaders,
  });
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return proxyIronboardConsole(request, path);
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return proxyIronboardConsole(request, path);
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return proxyIronboardConsole(request, path);
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return proxyIronboardConsole(request, path);
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return proxyIronboardConsole(request, path);
}
