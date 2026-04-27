"use client";

import Link from "next/link";
import IrontechChaosDeploy from "@/app/(dashboard)/opsupport/IrontechChaosDeploy";
import ControlRoom from "@/app/components/ControlRoom";
import { useSystemConfigStore } from "@/app/store/systemConfigStore";

/**
 * Dashboard left-rail control deck: compliance + adversary toggles + chaos deploy.
 * Shadow Plane Registry (10-bot card grid) lives on `/integrity` only — not mounted here.
 */
export default function IrontechLeftPaneControls() {
  const isSimulationActive = useSystemConfigStore().isSimulationMode;
  if (!isSimulationActive) return null;

  return (
    <section className="border-b border-zinc-900 bg-[#050509] p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[11px] font-black uppercase tracking-widest text-zinc-300">CONTROL ROOM</h2>
        <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
      </div>
      <div className="mb-4 flex justify-between text-[9px] font-black uppercase tracking-widest text-zinc-500">
        <Link href="/" className="transition-colors hover:text-emerald-500">
          Dashboard
        </Link>
        <Link href="/reports/ops" className="transition-colors hover:text-emerald-500">
          Reports
        </Link>
        <Link href="/integrity" className="transition-colors hover:text-emerald-500">
          Integrity hub
        </Link>
        <Link href="/settings" className="transition-colors hover:text-emerald-500">
          Settings
        </Link>
      </div>

      <div className="mt-1 w-full min-w-0 max-w-full">
        <ControlRoom>
          <IrontechChaosDeploy embedded />
        </ControlRoom>
      </div>
    </section>
  );
}
