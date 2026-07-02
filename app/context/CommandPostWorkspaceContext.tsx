"use client";

import { createContext, useContext } from "react";

import type { CommandPostWorkspaceTarget } from "@/app/lib/commandPostNavigation";

const CommandPostWorkspaceContext = createContext<CommandPostWorkspaceTarget | null>(null);

export function CommandPostWorkspaceProvider({
  initialTarget,
  children,
}: {
  initialTarget: CommandPostWorkspaceTarget;
  children: React.ReactNode;
}) {
  return (
    <CommandPostWorkspaceContext.Provider value={initialTarget}>
      {children}
    </CommandPostWorkspaceContext.Provider>
  );
}

export function useServerCommandPostTarget(): CommandPostWorkspaceTarget | null {
  return useContext(CommandPostWorkspaceContext);
}
