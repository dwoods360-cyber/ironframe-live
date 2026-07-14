import "server-only";

import { resolveIronboardBaseUrl } from "@/app/lib/conversationPlaneGateway";
import {
  IRONBOARD_CONSOLE_PROXY_PREFIX,
  IRONBOARD_OPERATIONS_PORTAL_PATH,
  ironboardConsoleBaseHref,
  ironboardConsoleProxyPath,
  resolveBoardroomEmbedUrl,
} from "@/app/lib/ironboardConsolePaths";

export {
  IRONBOARD_CONSOLE_PROXY_PREFIX,
  IRONBOARD_OPERATIONS_PORTAL_PATH,
  ironboardConsoleBaseHref,
  ironboardConsoleProxyPath,
  resolveBoardroomEmbedUrl,
};

export function resolveIronboardUpstreamUrl(pathname: string, search: string): string {
  const base = resolveIronboardBaseUrl();
  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${base}${path}${search}`;
}

export function injectIronboardConsoleBaseHref(html: string, baseHref: string): string {
  if (!html.includes("<head>")) return html;

  const normalized = baseHref.endsWith("/") ? baseHref : `${baseHref}/`;
  let out = html;

  if (!out.includes("<base ")) {
    out = out.replace("<head>", `<head>\n  <base href="${normalized}" />`);
  }

  if (!out.includes("__IRONBOARD_API_ROOT__")) {
    out = out.replace(
      "<head>",
      `<head>\n  <script>window.__IRONBOARD_API_ROOT__=${JSON.stringify(normalized)};</script>`,
    );
  }

  return out;
}
