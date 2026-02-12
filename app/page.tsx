'use client';
import React, { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';

export default function Page() {
  const [database, setDatabase] = useState<Record<string, any>>({
    'ironframe-live': { riskBuffer: [], timer: 0 }
  });

  const updateTenant = (tenant: string, updates: any) => {
    setDatabase((prev: any) => {
      const newDb = { ...prev };
      // FIX 1: Explicit cast for currentTenantDb
      const currentTenantDb = newDb[tenant] as any;
      
      if (currentTenantDb && currentTenantDb.riskBuffer && currentTenantDb.riskBuffer.length > 8) {
        const buffer = [...currentTenantDb.riskBuffer];
        buffer.sort((a, b) => (parseFloat(a.likelihood) * parseFloat(a.impact)) - (parseFloat(b.likelihood) * parseFloat(b.impact)));
        buffer.shift();
      }

      // FIX 2: Explicit cast for timer iteration
      Object.keys(newDb).forEach((key) => {
        if ((newDb[key] as any).timer > 0) (newDb[key] as any).timer -= 1;
      });

      // FIX 3: Explicit cast for spread operator
      return {
        ...prev,
        [tenant]: { ...(prev[tenant] as any), ...updates }
      };
    });
  };

  return <Dashboard />;
}
