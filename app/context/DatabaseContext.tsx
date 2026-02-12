'use client';
import React, { createContext, useContext, useState } from 'react';

const DatabaseContext = createContext<unknown>(null);

export function DatabaseProvider({ children }: { children: React.ReactNode }) {
  const [data] = useState<Record<string, unknown>>({});
  return (
    <DatabaseContext.Provider value={data}>
      {children}
    </DatabaseContext.Provider>
  );
}

export const useDatabase = () => useContext(DatabaseContext);
