"use client";

import { useEffect, useState } from "react";
import { getPlatformAdminToolsAccess } from "@/app/actions/platformAdminAccessActions";

const PLATFORM_ADMIN_ACCESS_TIMEOUT_MS = 10_000;

export type PlatformAdminToolsAccessState = {
  canUsePlatformAdminTools: boolean;
  resolved: boolean;
};

/**
 * Deferred GLOBAL_ADMIN gate for Command Center chips (OpSupport, etc.).
 * Fail-closed after timeout; never blocks first paint.
 */
export function usePlatformAdminToolsAccess(): PlatformAdminToolsAccessState {
  const [state, setState] = useState<PlatformAdminToolsAccessState>({
    canUsePlatformAdminTools: false,
    resolved: false,
  });

  useEffect(() => {
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    let frameId = 0;

    const finish = (canUsePlatformAdminTools: boolean) => {
      if (cancelled) return;
      setState({ canUsePlatformAdminTools, resolved: true });
    };

    frameId = window.requestAnimationFrame(() => {
      if (cancelled) return;

      timeoutId = window.setTimeout(() => {
        if (!cancelled) finish(false);
      }, PLATFORM_ADMIN_ACCESS_TIMEOUT_MS);

      void getPlatformAdminToolsAccess()
        .then((res) => {
          if (!cancelled) finish(res.canAccess);
        })
        .catch(() => {
          if (!cancelled) finish(false);
        })
        .finally(() => {
          if (timeoutId !== undefined) window.clearTimeout(timeoutId);
        });
    });

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frameId);
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
    };
  }, []);

  return state;
}
