"use client";

import type { MouseEvent, ReactNode } from "react";
import Link, { type LinkProps } from "next/link";
import NavMaturityBadge from "@/app/components/nav/NavMaturityBadge";
import { getStagedNavSurface } from "@/app/config/stagedNavSurfaces";
import { usePermissions } from "@/app/hooks/usePermissions";

type StagedNavLinkProps = LinkProps & {
  className?: string;
  children: ReactNode;
  title?: string;
};

/**
 * Dashboard nav link with optional maturity badge and GRC_MANAGER pilot guard
 * for stub surfaces defined in `stagedNavSurfaces`.
 */
export default function StagedNavLink({
  href,
  onClick,
  className = "",
  children,
  title,
  prefetch,
  ...rest
}: StagedNavLinkProps) {
  const hrefStr = typeof href === "string" ? href : (href.pathname ?? "/");
  const staged = getStagedNavSurface(hrefStr);
  const { role } = usePermissions();
  const blocked =
    staged != null && staged.blockRoles.includes(role);

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (blocked) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    onClick?.(event);
  };

  const blockedTitle =
    "Preview surface — not available for GRC Manager during design-partner pilots.";

  return (
    <Link
      {...rest}
      href={href}
      prefetch={blocked ? false : prefetch}
      onClick={handleClick}
      aria-disabled={blocked || undefined}
      tabIndex={blocked ? -1 : undefined}
      title={blocked ? blockedTitle : title}
      className={`${className}${blocked ? " cursor-not-allowed opacity-55 hover:opacity-55" : ""}`}
    >
      {children}
      {staged ? <NavMaturityBadge label={staged.badge} /> : null}
    </Link>
  );
}
