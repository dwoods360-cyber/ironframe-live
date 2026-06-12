"use client";

import { useEffect, useState } from "react";
import { getMetaAuditConsoleAccess } from "@/app/actions/auditActions";

const AUDIT_ACCESS_TIMEOUT_MS = 3_000;

export type AuditConsoleAccessState = {
  canViewAudit: boolean;
  /** Resolved (success or fail-closed timeout); chip never blocks first paint. */
  resolved: boolean;
};

/**
 * Decoupled meta-audit console gate — deferred off the navigation/render critical path.
 * Fail-closed after timeout; never suspends or blocks HeaderTwo render.
 */
export function useAuditConsoleAccess(): AuditConsoleAccessState {
  const [state, setState] = useState<AuditConsoleAccessState>({
    canViewAudit: false,
    resolved: false,
  });

  useEffect(() => {
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    let frameId = 0;

    const finish = (canViewAudit: boolean) => {
      if (cancelled) return;
      setState({ canViewAudit, resolved: true });
    };

    frameId = window.requestAnimationFrame(() => {
      if (cancelled) return;

      timeoutId = window.setTimeout(() => {
        if (!cancelled) finish(false);
      }, AUDIT_ACCESS_TIMEOUT_MS) as unknown as NodeJS.Timeout;

      void getMetaAuditConsoleAccess()
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
