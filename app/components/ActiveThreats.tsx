'use client';

import { useEffect } from 'react';
import { useRiskStore } from '@/app/store/riskStore';

export default function ActiveThreats() {
  const setDashboardLiability = useRiskStore((state) => state.setDashboardLiability);
  const removeDashboardLiability = useRiskStore((state) => state.removeDashboardLiability);

  useEffect(() => {
    // Register the live threats currently displayed in the UI
    setDashboardLiability('azure-api', 11.1);   // Azure Health API Exposure
    setDashboardLiability('palo-alto', 4.2);    // Palo Alto Firewall Misconfiguration

    return () => {
      removeDashboardLiability('azure-api');
      removeDashboardLiability('palo-alto');
    };
  }, [setDashboardLiability, removeDashboardLiability]);

  return null;
}
