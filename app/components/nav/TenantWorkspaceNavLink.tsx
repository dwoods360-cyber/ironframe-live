"use client";

import Link from "next/link";
import type { ComponentProps, MouseEvent, ReactNode } from "react";

import { useHostTenantSlug } from "@/app/hooks/useHostTenantSlug";
import { assignTenantWorkspaceNav } from "@/app/lib/nav/tenantWorkspaceNav";

type Props = ComponentProps<typeof Link> & {
  children: ReactNode;
};

/**
 * Workspace header link — on tenant subdomains uses `location.assign` so navigation
 * never stalls when leaving heavy standalone report routes.
 */
export default function TenantWorkspaceNavLink({
  href,
  onClick,
  children,
  prefetch = true,
  ...rest
}: Props) {
  const hostTenantSlug = useHostTenantSlug();
  const browserHost = typeof window !== "undefined" ? window.location.host : null;

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);
    if (event.defaultPrevented) return;
    if (assignTenantWorkspaceNav(href, browserHost, hostTenantSlug)) {
      event.preventDefault();
      event.stopPropagation();
    }
  };

  return (
    <Link href={href} prefetch={prefetch} onClick={handleClick} {...rest}>
      {children}
    </Link>
  );
}
