"use client";

import Link from "next/link";

import { ironboardConsoleProxyPath } from "@/app/lib/ironboardConsolePaths";

export default function IronboardPortalClient() {
  return (
    <div className="flex min-h-screen flex-col bg-[#020617] text-slate-100">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 px-4 py-3 sm:px-6">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-amber-400">
            IronBoard · 17-Agent Boardroom
          </p>
          <h1 className="text-lg font-bold text-white">Executive boardroom console</h1>
          <p className="mt-1 text-xs text-slate-500">
            GLOBAL_ADMIN only · CRM flywheel · live query roster · market integration
          </p>
        </div>
        <Link
          href="/dashboard/operations"
          className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:border-cyan-600"
        >
          ← Operations hub
        </Link>
      </header>
      <iframe
        title="IronBoard 17-Agent Boardroom"
        src={ironboardConsoleProxyPath()}
        className="min-h-0 w-full flex-1 border-0 bg-[#020617]"
      />
    </div>
  );
}
