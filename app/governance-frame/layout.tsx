import type { Metadata } from "next";

import GovernanceFrameBrandLockup from "@/app/components/governanceFrame/GovernanceFrameBrandLockup";

export const metadata: Metadata = {
  title: "The Governance Frame",
  description:
    "Chronological institutional governance briefings — local staging feed from docs/published-briefings.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function GovernanceFrameLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-950/95 backdrop-blur">
        <div className="mx-auto flex max-w-4xl flex-col gap-3 px-6 py-8">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.28em] text-slate-500">
            Ironframe · Institutional Intelligence
          </p>
          <GovernanceFrameBrandLockup />
          <p className="max-w-2xl font-sans text-sm text-slate-400">
            Chronological regulatory and technical briefings — published ledger only. Draft queue
            files are quarantined from this reader.
          </p>
        </div>
      </header>
      <div className="mx-auto max-w-4xl px-6 py-10">{children}</div>
    </div>
  );
}
