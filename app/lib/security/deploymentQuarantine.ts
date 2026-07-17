import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  isInfraHealthPath,
  isIronleadsIngressPath,
  isPublicCloudIngressPath,
  isSalesteamIngressPath,
  isSuccessTeamIngressPath,
  isSupportTeamIngressPath,
} from "@/app/utils/grcRouteMatch";
import { STRIPE_WEBHOOK_PATHS } from "@/config/stripe";
import { tenantSlugFromHost } from "@/app/lib/tenantSubdomain";
import { isGovernanceFramePublicHost } from "@/config/governanceFramePublic";

export const IRONFRAME_DEV_BYPASS_COOKIE = "ironframe_dev_bypass";

/**
 * Hosts that may reach Ironframe without ingress quarantine.
 * `*.lvh.me` resolves to 127.0.0.1 for local tenant-subdomain dev only — not public internet.
 */
export function isLocalDevelopmentHost(hostname: string): boolean {
  const host = hostname.trim().toLowerCase();
  return (
    host.startsWith("localhost") ||
    host.endsWith(".localhost") ||
    host.endsWith(".lvh.me") ||
    host.endsWith(".localtest.me") ||
    host === "127.0.0.1" ||
    host === "[::1]" ||
    host === "::1"
  );
}

/** Known tenant workspace host (e.g. vaultbank.ironframegrc.com). */
export function isTenantSubdomainHost(hostname: string): boolean {
  return tenantSlugFromHost(hostname) != null;
}

/**
 * Explicit opt-in to allow non-local ingress (preview drills, future GA).
 * Default: blocked — localhost / lvh.me only.
 */
export function isPublicIngressAllowed(): boolean {
  const flag = process.env.IRONFRAME_ALLOW_PUBLIC_INGRESS?.trim().toLowerCase();
  return flag === "1" || flag === "true" || flag === "yes";
}

/** @deprecated Use {@link isPublicIngressAllowed}. */
export function isDeploymentQuarantineActive(): boolean {
  return !isPublicIngressAllowed();
}

export function hasDeveloperBypassCookie(request: NextRequest): boolean {
  return request.cookies.has(IRONFRAME_DEV_BYPASS_COOKIE);
}

export function isStripeWebhookIngressPath(pathname: string): boolean {
  return (STRIPE_WEBHOOK_PATHS as readonly string[]).includes(pathname);
}

/** Cron, board RSS, and ironquery export — auth at route layer via Bearer / secret query. */
export function isTokenGatedApiIngressPath(pathname: string): boolean {
  if (pathname.startsWith("/api/internal/cron/")) return true;
  if (pathname === "/api/cron/narrate") return true;
  if (pathname === "/api/cron/gtm-briefing-queue") return true;
  if (pathname === "/api/board/feed") return true;
  if (pathname.startsWith("/api/internal/ironquery/export")) return true;
  if (pathname === "/api/internal/pki-health") return true;
  if (isIronleadsIngressPath(pathname)) return true;
  if (isSalesteamIngressPath(pathname)) return true;
  if (isSuccessTeamIngressPath(pathname)) return true;
  if (isSupportTeamIngressPath(pathname)) return true;
  if (isInfraHealthPath(pathname)) return true;
  return false;
}

/**
 * Returns true when the request must receive the 403 ingress block.
 * Narrow public funnel (auth, marketing, docs, auth callback) stays reachable on cloud hosts
 * until `IRONFRAME_ALLOW_PUBLIC_INGRESS` opens the full workspace.
 */
export function shouldBlockProductionIngress(
  request: NextRequest,
  pathname: string,
): boolean {
  const hostname = request.nextUrl.hostname;
  if (isLocalDevelopmentHost(hostname)) return false;
  if (isGovernanceFramePublicHost(request.headers.get("host") ?? hostname)) return false;
  if (isStripeWebhookIngressPath(pathname)) return false;
  if (isTokenGatedApiIngressPath(pathname)) return false;
  if (isPublicCloudIngressPath(pathname)) return false;
  if (isPublicIngressAllowed()) return false;
  return true;
}

export function buildDeploymentQuarantineResponse(
  baseResponse?: NextResponse,
): NextResponse {
  const response = new NextResponse(PRODUCTION_INGRESS_BLOCK_HTML, {
    status: 403,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
    },
  });

  baseResponse?.cookies.getAll().forEach(({ name, value }) => {
    response.cookies.set(name, value);
  });

  return response;
}

const PRODUCTION_INGRESS_BLOCK_HTML = `<body style="background:#020617;color:#64748b;font-family:monospace;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;margin:0;padding:24px;box-sizing:border-box">
  <div style="border:1px solid #1e293b;padding:32px;border-radius:12px;text-align:center;max-width:400px;width:100%">
    <h1 style="color:#f8fafc;font-size:14px;margin:0 0 12px 0;letter-spacing:0.05em">IRONFRAME SYSTEM ARCHITECTURE</h1>
    <p style="font-size:11px;line-height:1.6;margin:0">LOCAL DEVELOPMENT ONLY.<br>Public ingress is disabled.</p>
  </div>
</body>`;
