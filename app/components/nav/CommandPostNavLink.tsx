"use client";

import Link from "next/link";
import type { MouseEvent, ReactNode } from "react";

import { useCommandPostNavigation } from "@/app/hooks/useCommandPostNavigation";
import {
  buildWorkspaceLaunchUrl,
  navigateToTenantWorkspace,
} from "@/app/lib/auth/navigateToTenantWorkspace";
import { isApexControlPlaneHost } from "@/app/lib/tenantSubdomain";
import { readIronframeTenantSlugFromCookie } from "@/app/utils/clientTenantCookie";
import { useHostTenantSlug } from "@/app/hooks/useHostTenantSlug";

type Props = {
  children: ReactNode;
  className?: string;
  prefetch?: boolean;
  "data-testid"?: string;
};

function resolveApexWorkspaceSlug(
  navSlug: string | null | undefined,
  cookieSlug: string | null,
): string {
  return navSlug?.trim().toLowerCase() || cookieSlug?.trim().toLowerCase() || "";
}

/** Command Post entry — bootstraps session when hopping from apex localhost to a tenant host. */
export default function CommandPostNavLink({
  children,
  className,
  prefetch = true,
  "data-testid": testId,
}: Props) {
  const hostTenantSlug = useHostTenantSlug();
  const browserHost = typeof window !== "undefined" ? window.location.host : null;
  const nav = useCommandPostNavigation();
  const cookieSlug = typeof window !== "undefined" ? readIronframeTenantSlugFromCookie() : null;
  const workspaceSlug = resolveApexWorkspaceSlug(nav.workspaceSlug, cookieSlug);

  const handleApexLaunch = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    void (async () => {
      const slug = workspaceSlug || resolveApexWorkspaceSlug(nav.workspaceSlug, readIronframeTenantSlugFromCookie());
      if (!slug) return;
      await navigateToTenantWorkspace(slug, "/");
    })();
  };

  const handleTenantHomeClick = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    event.stopPropagation();
    window.location.assign("/");
  };

  const onTenantHost = browserHost ? !isApexControlPlaneHost(browserHost) : Boolean(hostTenantSlug);

  // Tenant workspace hosts: full document navigation to `/`.
  // Next.js soft `<Link>` transitions from standalone `/reports/*` surfaces can stall without
  // updating the route — matches browser-back-then-click behavior operators expect.
  if (onTenantHost) {
    return (
      <Link
        href="/"
        prefetch={false}
        data-testid={testId}
        className={className}
        onClick={handleTenantHomeClick}
      >
        {children}
      </Link>
    );
  }

  const launchHref =
    workspaceSlug
      ? buildWorkspaceLaunchUrl(workspaceSlug, "/")
      : nav.href.startsWith("/api/auth/workspace-launch")
        ? nav.href
        : "#";

  return (
    <a
      href={launchHref}
      data-testid={testId}
      data-command-post-slug={workspaceSlug || undefined}
      data-command-post-ready={workspaceSlug ? "true" : "false"}
      className={className}
      onClick={handleApexLaunch}
      aria-disabled={!workspaceSlug && launchHref === "#"}
      title={
        workspaceSlug
          ? `Open ${workspaceSlug} Command Post`
          : "Select a workspace in the header switcher, then open Command Post"
      }
    >
      {children}
    </a>
  );
}
