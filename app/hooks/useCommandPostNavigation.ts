"use client";

import { useCallback, useEffect, useState } from "react";

import { resolveCommandPostNavigationTarget } from "@/app/actions/tenantActions";
import { useServerCommandPostTarget } from "@/app/context/CommandPostWorkspaceContext";
import {
  isCommandPostNavigationReady,
  resolveCommandPostWorkspaceTarget,
  type CommandPostWorkspaceTarget,
} from "@/app/lib/commandPostNavigation";
import { isApexControlPlaneHost } from "@/app/lib/tenantSubdomain";
import { useHostTenantSlug } from "@/app/hooks/useHostTenantSlug";

type CommandPostNavigation = CommandPostWorkspaceTarget & {
  ready: boolean;
};

const PENDING_TARGET: CommandPostNavigation = {
  href: "#",
  usesWorkspaceOrigin: false,
  workspaceSlug: null,
  ready: false,
};

function resolveReadyTarget(
  resolved: CommandPostWorkspaceTarget,
  browserHost: string | null,
): CommandPostNavigation {
  return {
    ...resolved,
    ready: isCommandPostNavigationReady(resolved, browserHost),
  };
}

export function useCommandPostNavigation(): CommandPostNavigation {
  const hostTenantSlug = useHostTenantSlug();
  const serverTarget = useServerCommandPostTarget();
  const [target, setTarget] = useState<CommandPostNavigation>(() => {
    if (typeof window === "undefined") {
      return serverTarget
        ? resolveReadyTarget(serverTarget, null)
        : PENDING_TARGET;
    }
    return serverTarget
      ? resolveReadyTarget(serverTarget, window.location.host)
      : PENDING_TARGET;
  });

  const refreshTarget = useCallback(async () => {
    const browserHost =
      typeof window !== "undefined" ? window.location.host : null;
    const onApex = isApexControlPlaneHost(browserHost);

    if (!onApex && hostTenantSlug) {
      const resolved = resolveCommandPostWorkspaceTarget(hostTenantSlug, [], null);
      setTarget(resolveReadyTarget(resolved, browserHost));
      return;
    }

    try {
      const resolved = await resolveCommandPostNavigationTarget();
      setTarget(resolveReadyTarget(resolved, browserHost));
    } catch {
      if (serverTarget) {
        setTarget(resolveReadyTarget(serverTarget, browserHost));
        return;
      }
      setTarget(PENDING_TARGET);
    }
  }, [hostTenantSlug, serverTarget]);

  useEffect(() => {
    if (serverTarget) {
      const browserHost =
        typeof window !== "undefined" ? window.location.host : null;
      setTarget(resolveReadyTarget(serverTarget, browserHost));
    }
  }, [serverTarget]);

  useEffect(() => {
    void refreshTarget();
  }, [refreshTarget]);

  useEffect(() => {
    const onTenantChanged = () => {
      void refreshTarget();
    };
    window.addEventListener("ironframe-tenant-changed", onTenantChanged);
    return () => window.removeEventListener("ironframe-tenant-changed", onTenantChanged);
  }, [refreshTarget]);

  return target;
}
