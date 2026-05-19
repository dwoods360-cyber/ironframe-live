"use client";

import Link from "next/link";
import { useSustainabilityStaleLockdownBlocking } from "@/app/context/ConstitutionalIntegrityProvider";
import {
  IRONTECH_STALE_LOCKDOWN_MESSAGE,
  LOCKDOWN_PROLONGED_OUTAGE_BANNER_TITLE,
} from "@/app/config/sustainabilityStaleLockdown";

export default function StaleDataLockdownBanner() {
  const blocking = useSustainabilityStaleLockdownBlocking();
  if (!blocking) return null;

  return (
    <div
      className="pointer-events-auto fixed left-0 right-0 top-0 z-[170] border-b-2 border-red-600 bg-red-950 px-4 py-2.5 font-mono text-[11px] text-red-50 shadow-[0_4px_24px_rgba(220,38,38,0.45)]"
      role="alert"
    >
      <p className="text-center font-black uppercase tracking-[0.2em] text-red-200">
        {LOCKDOWN_PROLONGED_OUTAGE_BANNER_TITLE}
      </p>
      <p className="mt-1 text-center text-[10px] leading-snug text-red-100/95">{IRONTECH_STALE_LOCKDOWN_MESSAGE}</p>
      <p className="mt-1 text-center text-[9px] uppercase tracking-wide text-red-300/95">
        Tripartite split-keys only —{" "}
        <Link href="/settings/config#stale-data-waiver" className="font-bold text-red-100 underline underline-offset-2">
          apply 3-key stale-data waiver
        </Link>
      </p>
    </div>
  );
}
