"use client";

import Link from "next/link";
import type { MouseEvent, ReactNode } from "react";

type Props = {
  children: ReactNode;
  className?: string;
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
};

/**
 * Analyst exports entry — uses full document navigation so server redirects
 * (export scope, billing hold) are never swallowed by client-side soft routing.
 */
export default function AnalystExportsLink({ children, className, onClick }: Props) {
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);
    event.preventDefault();
    event.stopPropagation();
    window.location.assign("/exports");
  };

  return (
    <Link
      href="/exports"
      data-testid="analyst-exports-link"
      onClick={handleClick}
      className={className}
    >
      {children}
    </Link>
  );
}
