"use client";

import InTenantSupportModal from "@/app/components/support/InTenantSupportModal";
import { REQUEST_ENGINEERING_HELP_LABEL } from "@/app/components/support/RequestEngineeringHelpTrigger";

export default function AuthenticatedSupportConsole() {
  return (
    <div className="relative flex min-h-[calc(100vh-5rem)] flex-col overflow-hidden bg-[#020617] p-4 text-slate-100 sm:p-6">
      <div className="pointer-events-none absolute inset-0 z-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-20 [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />

      <div className="relative z-10 mx-auto w-full max-w-lg space-y-4">
        <header className="border-b border-slate-800/80 pb-4">
          <p className="font-mono text-[10px] uppercase tracking-widest text-cyan-400">
            {REQUEST_ENGINEERING_HELP_LABEL}
          </p>
          <h1 className="mt-1 text-xl font-bold tracking-tight text-white">
            {REQUEST_ENGINEERING_HELP_LABEL}
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Use <span className="text-cyan-300">Support</span> in the top navigation to open this
            panel from any cockpit route.
          </p>
        </header>

        <InTenantSupportModal />
      </div>
    </div>
  );
}
