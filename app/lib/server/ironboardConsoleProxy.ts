import "server-only";

import { resolveIronboardBaseUrl } from "@/app/lib/conversationPlaneGateway";
import {
  IRONBOARD_CONSOLE_PROXY_PREFIX,
  IRONBOARD_OPERATIONS_PORTAL_PATH,
  ironboardConsoleBaseHref,
  ironboardConsoleProxyPath,
} from "@/app/lib/ironboardConsolePaths";

export {
  IRONBOARD_CONSOLE_PROXY_PREFIX,
  IRONBOARD_OPERATIONS_PORTAL_PATH,
  ironboardConsoleBaseHref,
  ironboardConsoleProxyPath,
};

export function resolveIronboardUpstreamUrl(pathname: string, search: string): string {
  const base = resolveIronboardBaseUrl();
  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${base}${path}${search}`;
}

export function injectIronboardConsoleBaseHref(html: string, baseHref: string): string {
  if (html.includes("<base ")) return html;
  if (html.includes("<head>")) {
    return html.replace("<head>", `<head>\n  <base href="${baseHref}" />`);
  }
  return html;
}
