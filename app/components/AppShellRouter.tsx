import { headers } from "next/headers";
import { Suspense } from "react";

import ConditionalAppShell from "@/app/components/ConditionalAppShell";
import { CommandPostWorkspaceProvider } from "@/app/context/CommandPostWorkspaceContext";
import { resolveServerCommandPostTarget } from "@/app/lib/auth/resolveCommandPostTarget.server";
import {
  isDocsPathname,
  isInviteTokenRegistrationPath,
  isMarketingPathname,
  isPublicDarkShellPath,
  PUBLIC_DARK_SHELL_CLASS,
  resolvePublicDarkShellSurface,
} from "@/app/lib/publicFunnelShell";
import { isViewportBoundedDashboardPath } from "@/app/utils/grcRouteMatch";
import {
  isGovernanceFramePublicHost,
  isGovernanceFramePublicPath,
} from "@/config/governanceFramePublic";
import { IRONFRAME_PATHNAME_HEADER } from "@/lib/supabase/middleware";

function PublicDarkShell({
  surface,
  children,
}: {
  surface: ReturnType<typeof resolvePublicDarkShellSurface>;
  children: React.ReactNode;
}) {
  return (
    <div data-ironframe-public="true" data-ironframe-surface={surface} className={PUBLIC_DARK_SHELL_CLASS}>
      {children}
    </div>
  );
}

/** SSR-safe fallback — matches ConditionalAppShell scroll mode for the active route. */
function ShellSuspenseFallback({
  pathname,
  children,
}: {
  pathname: string;
  children: React.ReactNode;
}) {
  const viewportBounded = isViewportBoundedDashboardPath(pathname);
  return (
    <div
      className={`flex min-h-0 min-w-0 flex-1 flex-col ${
        viewportBounded
          ? "overflow-hidden"
          : "overflow-y-auto overflow-x-hidden overscroll-y-contain [scrollbar-gutter:stable] custom-scrollbar"
      }`}
    >
      {children}
    </div>
  );
}

/**
 * Server-side shell router — public funnel routes bypass client ConditionalAppShell traps
 * and render with a pinned dark scroll surface (incognito / system-light safe).
 * Command Post (`/`) stays client-auth-aware in ConditionalAppShell.
 * research.ironframegrc.com never mounts SaaS Command Post chrome.
 */
export default async function AppShellRouter({ children }: { children: React.ReactNode }) {
  const requestHeaders = await headers();
  const pathname = requestHeaders.get(IRONFRAME_PATHNAME_HEADER) ?? "";
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const isGovernanceFramePublication =
    isGovernanceFramePublicHost(host) || isGovernanceFramePublicPath(pathname);

  if (isGovernanceFramePublication) {
    return (
      <div
        data-ironframe-surface="governance-frame-research"
        className="relative z-0 min-h-[100dvh] w-full overflow-y-auto"
      >
        {children}
      </div>
    );
  }

  const isCommandPostRoot = pathname === "/" || pathname === "";
  const isPublicFunnel =
    !isCommandPostRoot &&
    (isDocsPathname(pathname) ||
      isInviteTokenRegistrationPath(pathname) ||
      isMarketingPathname(pathname) ||
      isPublicDarkShellPath(pathname));
  const needsCommandPostProvider = !isPublicFunnel;

  const inner = !isCommandPostRoot && isPublicFunnel ? (
    <PublicDarkShell surface={resolvePublicDarkShellSurface(pathname)}>{children}</PublicDarkShell>
  ) : (
    <Suspense fallback={<ShellSuspenseFallback pathname={pathname}>{children}</ShellSuspenseFallback>}>
      <ConditionalAppShell>{children}</ConditionalAppShell>
    </Suspense>
  );

  if (!needsCommandPostProvider) {
    return inner;
  }

  const commandPostTarget = await resolveServerCommandPostTarget();
  return (
    <CommandPostWorkspaceProvider initialTarget={commandPostTarget}>{inner}</CommandPostWorkspaceProvider>
  );
}
