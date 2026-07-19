"use client";

import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";

import AppShell from "@/app/components/AppShell";
import { useOperatorContext } from "@/app/context/OperatorContext";
import {
  isAuthPublicPath,
  isDashboardRouteGroupPath,
} from "@/app/utils/grcRouteMatch";
import {
  isGovernanceFramePublicHost,
  isGovernanceFramePublicPath,
} from "@/config/governanceFramePublic";
import { isPublicRegistrationEnabled, SALES_CONTACT_PATH } from "@/config/registration";

function subscribeNoop() {
  return () => {};
}

function readGovernanceFrameHost(): boolean {
  return isGovernanceFramePublicHost(window.location.host);
}

/**
 * Root-level shell router — public/auth routes and `(dashboard)` routes skip AppShell here.
 * Dashboard chrome mounts in `app/(dashboard)/layout.tsx` to prevent login screen leakage.
 */
export default function ConditionalAppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, isInitializing } = useOperatorContext();
  const isGfPublicHost = useSyncExternalStore(subscribeNoop, readGovernanceFrameHost, () => false);

  const isDocsHub = pathname === "/docs" || pathname.startsWith("/docs/");

  const isPublicLanding = pathname === "/" && !isInitializing && user == null;
  const isMarketingPage = pathname === "/marketing";
  const isPublicPricing = pathname === "/pricing";
  const isGovernanceFrame =
    isGfPublicHost ||
    isGovernanceFramePublicPath(pathname) ||
    pathname === "/governance-frame" ||
    pathname.startsWith("/governance-frame/");
  const isPublicLegal =
    pathname === "/terms" || pathname === "/privacy" || pathname === "/legal/accept";
  const isPublicRegistration =
    pathname === SALES_CONTACT_PATH ||
    (isPublicRegistrationEnabled() &&
      (pathname === "/register/setup" || pathname === "/register/demo"));

  const isAuthPublic = isAuthPublicPath(pathname);

  const isDashboardGroup = isDashboardRouteGroupPath(pathname);

  if (isDashboardGroup) {
    return <>{children}</>;
  }

  if (
    isAuthPublic ||
    isPublicLanding ||
    isMarketingPage ||
    isPublicPricing ||
    isGovernanceFrame ||
    isPublicLegal ||
    isPublicRegistration
  ) {
    return (
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto bg-[var(--bg-primary)]">
        {children}
      </div>
    );
  }

  /** Signed-in operators reading docs still get workspace chrome (Command Post nav). */
  if (isDocsHub && !isInitializing && user != null) {
    return <AppShell>{children}</AppShell>;
  }

  if (isDocsHub) {
    return (
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto bg-[var(--bg-primary)]">
        {children}
      </div>
    );
  }

  return <AppShell>{children}</AppShell>;
}
