import { headers } from "next/headers";
import { Suspense } from "react";

import ConditionalAppShell from "@/app/components/ConditionalAppShell";
import {
  isDocsPathname,
  isInviteTokenRegistrationPath,
  isMarketingPathname,
  isPublicDarkShellPath,
  PUBLIC_DARK_SHELL_CLASS,
  resolvePublicDarkShellSurface,
} from "@/app/lib/publicFunnelShell";
import { isViewportBoundedDashboardPath } from "@/app/utils/grcRouteMatch";
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
 */
export default async function AppShellRouter({ children }: { children: React.ReactNode }) {
  const pathname = (await headers()).get(IRONFRAME_PATHNAME_HEADER) ?? "";
  const isCommandPostRoot = pathname === "/" || pathname === "";

  if (
    !isCommandPostRoot &&
    (isDocsPathname(pathname) ||
      isInviteTokenRegistrationPath(pathname) ||
      isMarketingPathname(pathname) ||
      isPublicDarkShellPath(pathname))
  ) {
    return (
      <PublicDarkShell surface={resolvePublicDarkShellSurface(pathname)}>{children}</PublicDarkShell>
    );
  }

  return (
    <Suspense fallback={<ShellSuspenseFallback pathname={pathname}>{children}</ShellSuspenseFallback>}>
      <ConditionalAppShell>{children}</ConditionalAppShell>
    </Suspense>
  );
}
