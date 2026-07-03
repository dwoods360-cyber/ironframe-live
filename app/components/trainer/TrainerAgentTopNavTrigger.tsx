"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

import { useTenantBillingGate } from "@/app/context/TenantBillingGateContext";
import { useOperatorIdentity } from "@/app/hooks/useOperatorIdentity";
import { useTrainerAgentDrawerStore } from "@/app/store/trainerAgentDrawerStore";
import { isAuthPublicPath } from "@/app/utils/grcRouteMatch";

export default function TrainerAgentTopNavTrigger() {
  const pathname = usePathname();
  const { billingBlocked } = useTenantBillingGate();
  const { isGuest, isLoading } = useOperatorIdentity();
  const isOpen = useTrainerAgentDrawerStore((s) => s.isOpen);
  const toggle = useTrainerAgentDrawerStore((s) => s.toggle);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  if (!hydrated || isLoading || isGuest || isAuthPublicPath(pathname) || billingBlocked) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-expanded={isOpen}
      aria-controls="trainer-agent-drawer"
      className={`inline-flex min-h-8 items-center rounded border px-2.5 font-mono text-[8px] font-bold uppercase tracking-wide transition ${
        isOpen
          ? "border-cyan-500/70 bg-cyan-950/50 text-cyan-200"
          : "border-indigo-700/50 bg-indigo-950/30 text-indigo-200 hover:border-indigo-500/60 hover:bg-indigo-950/50"
      }`}
    >
      Ask Trainer
    </button>
  );
}
