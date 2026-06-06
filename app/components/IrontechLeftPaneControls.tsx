"use client";

import Link from "next/link";
import { Folder } from "lucide-react";
import IrontechChaosDeploy from "@/app/(dashboard)/opsupport/IrontechChaosDeploy";
import ControlRoom from "@/app/components/ControlRoom";
import { useSystemConfigStore } from "@/app/store/systemConfigStore";

/**
 * Dashboard left-rail control deck: AGENT STATUS PULSE (top quadrant) + chaos deploy when simulation mode is on.
 */
export default function IrontechLeftPaneControls() {
  const isSimulationActive = useSystemConfigStore().isSimulationMode;

  return (
    <section className="w-full min-w-0 max-w-full shrink-0 border-b border-zinc-900 bg-[#050509]">
      <ControlRoom>{isSimulationActive ? <IrontechChaosDeploy embedded /> : null}</ControlRoom>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-zinc-900/80 px-4 py-3 text-[9px] font-black uppercase tracking-widest text-zinc-500">
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
    </section>
  );
}
