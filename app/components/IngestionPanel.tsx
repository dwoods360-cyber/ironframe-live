"use client";

import { useHasMounted } from "@/app/hooks/useHasMounted";

type Props = {
  children: React.ReactNode;
  /**
   * When true (default), defer full ingestion subtree until client mount so cookie/env-only “live range” UI
   * cannot diverge from SSR (hydration-safe shell first).
   */
  deferHydrationUntilMounted?: boolean;
};

/**
 * Ingestion panel wrapper. Renders the ingestion UI so test runs and validation are always available.
 * Default: server + first client paint show the **base** loading shell; “live range” / cookie-driven subtree
 * only after mount — avoids Shadow Plane hydration mismatches (`ThreatPipeline` inside `children`).
 *
 * Risk Velocity (raw signals inside `ThreatPipeline`): only `status === 'pending'` (or legacy
 * `velocityLifecycle === 'pending'`) lists; promoted / pipeline-backed ids are excluded.
 * There is no dedicated Prisma `signals` table; persistence is `ThreatEvent.ingestionDetails` + client queue.
 */
export default function IngestionPanel({
  children,
  deferHydrationUntilMounted = true,
}: Props) {
  const mounted = useHasMounted();

  if (deferHydrationUntilMounted && !mounted) {
    return (
      <div
        className="w-full min-h-[120px] rounded border border-slate-800 bg-slate-950/40 p-4"
        data-testid="test-run-ingestion"
        aria-busy="true"
      >
        <p className="text-center font-sans text-[11px] text-slate-500">Loading ingestion surface…</p>
      </div>
    );
  }

  return (
    <div className="w-full min-h-[120px]" data-testid="test-run-ingestion">
      {children}
    </div>
  );
}
