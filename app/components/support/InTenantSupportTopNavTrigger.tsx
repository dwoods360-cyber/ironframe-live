"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

import { useOperatorIdentity } from "@/app/hooks/useOperatorIdentity";
import { useInTenantSupportDrawerStore } from "@/app/store/inTenantSupportDrawerStore";
import { isAuthPublicPath } from "@/app/utils/grcRouteMatch";

export default function InTenantSupportTopNavTrigger() {
  const pathname = usePathname();
  const { isGuest, isLoading } = useOperatorIdentity();
  const isOpen = useInTenantSupportDrawerStore((s) => s.isOpen);
  const toggle = useInTenantSupportDrawerStore((s) => s.toggle);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  if (!hydrated || isLoading || isGuest || isAuthPublicPath(pathname)) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-expanded={isOpen}
      aria-controls="in-tenant-support-drawer"
      className={`inline-flex min-h-11 items-center rounded border px-2.5 font-mono text-[8px] font-bold uppercase tracking-wide transition ${
        isOpen
          ? "border-cyan-500/70 bg-cyan-950/50 text-cyan-200"
          : "border-slate-700/60 bg-slate-950/40 text-slate-300 hover:border-cyan-500/40 hover:text-cyan-200"
      }`}
    >
      Support
    </button>
  );
}
