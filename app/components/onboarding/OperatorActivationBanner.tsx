"use client";

import { useHostTenantSlug } from "@/app/hooks/useHostTenantSlug";
import { useTenantContext } from "@/app/context/TenantProvider";

/**
 * Post-auth acknowledgment on Get Started — invite/legal steps belong to Bucket A (email / activation).
 */
export default function OperatorActivationBanner() {
  const { activeTenantKey } = useTenantContext();
  const hostSlug = useHostTenantSlug();
  const workspaceSlug = hostSlug ?? activeTenantKey ?? "your workspace";

  return (
    <div className="rounded-xl border border-cyan-500/25 bg-cyan-950/15 px-4 py-3 text-xs leading-relaxed text-cyan-100/90">
      <p className="font-mono text-[10px] uppercase tracking-widest text-cyan-400">
        Workspace activation complete
      </p>
      <p className="mt-1 text-slate-300">
        You are signed in to <strong className="font-semibold text-white">{workspaceSlug}</strong>.
        Invite, password, and MSA/DPA steps were handled in your activation email and secure
        registration — this portal covers Command Post orientation only.
      </p>
    </div>
  );
}
