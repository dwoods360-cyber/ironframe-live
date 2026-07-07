"use client";

import { useEffect, useState } from "react";
import { getPerimeterWorkforceAccess } from "@/app/actions/perimeterWorkforceAccessActions";

const PERIMETER_ACCESS_TIMEOUT_MS = 10_000;

export type PerimeterWorkforceAccessState = {
  canUsePerimeterWorkforce: boolean;
  resolved: boolean;
};

/**
 * Deferred perimeter workforce gate for Operations Hub nav (GLOBAL_ADMIN or BUSINESS_ADMIN).
 */
export function usePerimeterWorkforceAccess(): PerimeterWorkforceAccessState {
  const [state, setState] = useState<PerimeterWorkforceAccessState>({
    canUsePerimeterWorkforce: false,
    resolved: false,
  });

  useEffect(() => {
    let cancelled = false;
    let timeoutId: number | undefined;
    let frameId = 0;

    const finish = (canUsePerimeterWorkforce: boolean) => {
      if (cancelled) return;
      setState({ canUsePerimeterWorkforce, resolved: true });
    };

    frameId = window.requestAnimationFrame(() => {
      if (cancelled) return;

      timeoutId = window.setTimeout(() => {
        if (!cancelled) finish(false);
      }, PERIMETER_ACCESS_TIMEOUT_MS);

      void getPerimeterWorkforceAccess()
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
