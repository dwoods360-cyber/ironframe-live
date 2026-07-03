"use client";

import { createContext, useContext } from "react";

type HostTenantScope = {
  slug: string | null;
  uuid: string | null;
};

const HostTenantScopeContext = createContext<HostTenantScope>({ slug: null, uuid: null });

export function HostTenantSlugProvider({
  initialHostTenantSlug,
  initialHostTenantUuid,
  children,
}: {
  initialHostTenantSlug: string | null;
  initialHostTenantUuid: string | null;
  children: React.ReactNode;
}) {
  return (
    <HostTenantScopeContext.Provider
      value={{ slug: initialHostTenantSlug, uuid: initialHostTenantUuid }}
    >
      {children}
    </HostTenantScopeContext.Provider>
  );
}

export function useHostTenantSlugServerSnapshot(): string | null {
  return useContext(HostTenantScopeContext).slug;
}

export function useHostTenantUuidServerSnapshot(): string | null {
  return useContext(HostTenantScopeContext).uuid;
}
