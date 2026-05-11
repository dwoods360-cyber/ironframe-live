"use client";

import Link from "next/link";
import { Folder } from "lucide-react";
import IrontechChaosDeploy from "@/app/(dashboard)/opsupport/IrontechChaosDeploy";
import ControlRoom from "@/app/components/ControlRoom";
import { useSystemConfigStore } from "@/app/store/systemConfigStore";

/**
 * Dashboard left-rail control deck: quick links (always) + chaos deploy when simulation mode is on.
 */
export default function IrontechLeftPaneControls() {
  const isSimulationActive = useSystemConfigStore().isSimulationMode;

  return (
    <section className="border-b border-zinc-900 bg-[#050509] p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[11px] font-black uppercase tracking-widest text-zinc-300">CONTROL ROOM</h2>
        <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
      </div>
      <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-[9px] font-black uppercase tracking-widest text-zinc-500">
        <Link href="/" className="transition-colors hover:text-emerald-500">
          Dashboard
        </Link>
        <Link href="/reports/ops" className="transition-colors hover:text-emerald-500">
          Reports
        </Link>
        <Link href="/vault" className="inline-flex items-center gap-1 transition-colors hover:text-teal-400" title="Evidence Vault">
          <Folder className="h-3.5 w-3.5 shrink-0 text-teal-400/90" aria-hidden />
          Vault
        </Link>
        <Link href="/integrity" className="transition-colors hover:text-emerald-500">
          Integrity hub
        </Link>
        <Link href="/settings" className="transition-colors hover:text-emerald-500">
          Settings
        </Link>
      </div>

      <div className="mt-1 w-full min-w-0 max-w-full">
        <ControlRoom>{isSimulationActive ? <IrontechChaosDeploy embedded /> : null}</ControlRoom>
      </div>
    </section>
  );
}
