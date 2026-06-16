"use client";

import { usePathname } from "next/navigation";
import AppShell from "@/app/components/AppShell";
import { useOperatorContext } from "@/app/context/OperatorContext";
import {
  isAuthPublicPath,
  isDashboardRouteGroupPath,
} from "@/app/utils/grcRouteMatch";

/**
 * Root-level shell router — public/auth routes and `(dashboard)` routes skip AppShell here.
 * Dashboard chrome mounts in `app/(dashboard)/layout.tsx` to prevent login screen leakage.
 */
export default function ConditionalAppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, isInitializing } = useOperatorContext();
  const isDocsHub = pathname === "/docs" || pathname.startsWith("/docs/");
  const isPublicLanding = pathname === "/" && !isInitializing && user == null;
  const isAuthPublic = isAuthPublicPath(pathname);
  const isDashboardGroup = isDashboardRouteGroupPath(pathname);

  if (isDashboardGroup) {
    return <>{children}</>;
  }

  if (isDocsHub || isPublicLanding || isAuthPublic) {
    return (
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto bg-[var(--bg-primary)]">
        {children}
      </div>
    );
  }

  return <AppShell>{children}</AppShell>;
}
