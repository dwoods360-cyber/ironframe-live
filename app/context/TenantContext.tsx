'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

// Legacy Ironframe client keys (ALE baselines). Prefer `TenantProvider` + cookie for routing.
export type TenantId = 'medshield-id' | 'vaultbank-id' | 'gridcore-id';

interface TenantContextType {
  /** Null at boot — no implicit Medshield / index-0 default. */
  activeTenant: TenantId | null;
  setActiveTenant: (tenant: TenantId | null) => void;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export function TenantProvider({ children }: { children: ReactNode }) {
  const [activeTenant, setActiveTenant] = useState<TenantId | null>(null);

  return (
    <TenantContext.Provider value={{ activeTenant, setActiveTenant }}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
}
