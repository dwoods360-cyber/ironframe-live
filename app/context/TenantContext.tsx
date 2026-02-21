'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

// Defining our primary Ironframe clients based on the ALE Baselines
export type TenantId = 'medshield-id' | 'vaultbank-id' | 'gridcore-id';

interface TenantContextType {
  activeTenant: TenantId;
  setActiveTenant: (tenant: TenantId) => void;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export function TenantProvider({ children }: { children: ReactNode }) {
  // Defaulting the dashboard to Medshield Health on initial load
  const [activeTenant, setActiveTenant] = useState<TenantId>('medshield-id');

  return (
    <TenantContext.Provider value={{ activeTenant, setActiveTenant }}>
      {children}
    </TenantContext.Provider>
  );
}

// Custom hook so any component can instantly know who the active client is
export function useTenant() {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
}