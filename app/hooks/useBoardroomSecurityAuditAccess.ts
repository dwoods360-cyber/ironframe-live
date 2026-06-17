"use client";

import { useEffect, useState } from "react";

import { canAccessBoardroomSecurityAuditNav } from "@/app/(dashboard)/boardroom/admin/audit-logs/actions";

const ACCESS_TIMEOUT_MS = 3_000;

export type BoardroomSecurityAuditAccessState = {
  canViewSecurityAuditLogs: boolean;
  resolved: boolean;
};

/**
 * Deferred nav gate for Boardroom Security Audit Logs — matches HeaderTwo audit chip pattern.
 */
export function useBoardroomSecurityAuditAccess(): BoardroomSecurityAuditAccessState {
  const [state, setState] = useState<BoardroomSecurityAuditAccessState>({
    canViewSecurityAuditLogs: false,
    resolved: false,
  });

  useEffect(() => {
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    let frameId = 0;

    const finish = (canViewSecurityAuditLogs: boolean) => {
      if (cancelled) return;
      setState({ canViewSecurityAuditLogs, resolved: true });
    };

    frameId = window.requestAnimationFrame(() => {
      if (cancelled) return;

      timeoutId = window.setTimeout(() => {
        if (!cancelled) finish(false);
      }, ACCESS_TIMEOUT_MS) as unknown as ReturnType<typeof setTimeout>;

      void canAccessBoardroomSecurityAuditNav()
        .then((allowed) => {
          if (!cancelled) finish(allowed);
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
