"use client";

import { createContext, useContext, type ReactNode } from "react";

type TenantBillingGateContextValue = {
  billingBlocked: boolean;
  billingStatus: string;
};

const TenantBillingGateContext = createContext<TenantBillingGateContextValue>({
  billingBlocked: false,
  billingStatus: "UNTRACKED",
});

export function TenantBillingGateProvider({
  billingBlocked,
  billingStatus,
  children,
}: TenantBillingGateContextValue & { children: ReactNode }) {
  return (
    <TenantBillingGateContext.Provider value={{ billingBlocked, billingStatus }}>
      {children}
    </TenantBillingGateContext.Provider>
  );
}

export function useTenantBillingGate(): TenantBillingGateContextValue {
  return useContext(TenantBillingGateContext);
}
