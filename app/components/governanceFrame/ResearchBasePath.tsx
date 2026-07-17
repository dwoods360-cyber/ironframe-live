"use client";

import Link, { type LinkProps } from "next/link";
import { createContext, useContext, type ReactNode } from "react";

const ResearchBasePathContext = createContext("");

export function ResearchBasePathProvider({
  basePath,
  children,
}: {
  basePath: string;
  children: ReactNode;
}) {
  return (
    <ResearchBasePathContext.Provider value={basePath}>{children}</ResearchBasePathContext.Provider>
  );
}

export function useResearchBasePath(): string {
  return useContext(ResearchBasePathContext);
}

type ResearchLinkProps = Omit<LinkProps, "href"> & {
  href: string;
  className?: string;
  children: ReactNode;
};

/** Link scoped to the research publication base path. */
export function ResearchLink({ href, children, ...props }: ResearchLinkProps) {
  const basePath = useResearchBasePath();
  const normalized = href.startsWith("/") ? href : `/${href}`;
  const resolved = normalized === "/" ? basePath || "/" : `${basePath}${normalized}`;
  return (
    <Link href={resolved} {...props}>
      {children}
    </Link>
  );
}
