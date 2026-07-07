"use client";

import { CommandPostWorkspaceProvider } from "@/app/context/CommandPostWorkspaceContext";
import type { CommandPostWorkspaceTarget } from "@/app/lib/commandPostNavigation";

/** Client boundary for SSR-resolved Command Post navigation target. */
export default function CommandPostWorkspaceShell({
  initialTarget,
  children,
}: {
  initialTarget: CommandPostWorkspaceTarget;
  children: React.ReactNode;
}) {
  return (
    <CommandPostWorkspaceProvider initialTarget={initialTarget}>
      {children}
    </CommandPostWorkspaceProvider>
  );
}
