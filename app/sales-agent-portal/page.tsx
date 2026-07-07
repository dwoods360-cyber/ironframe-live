import Link from "next/link";

import SalesAgentPortalContent from "@/app/components/marketing/SalesAgentPortalContent";
import PublicApexNav from "@/app/components/marketing/PublicApexNav";
import { getSupabaseSessionUser } from "@/app/utils/serverAuth";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Sales Agent Portal | Ironframe GRC",
  description:
    "Pre-flight lead conversion gates — evaluate your GRC environment profile with the AI Growth & Strategy Specialist.",
};

/** Public full-page sales intake — centered layout with site navigation (no slide-over frame). */
export default async function SalesAgentPortalPage() {
  const sessionUser = await getSupabaseSessionUser();

  return (
    <main
      className="ironframe-public-landing min-h-screen bg-[#020617] text-slate-100"
      data-ironframe-surface="public-funnel"
    >
      <PublicApexNav isAuthenticated={Boolean(sessionUser)} />

      <div className="mx-auto flex min-h-[calc(100dvh-2.75rem)] w-full max-w-xl flex-col items-center justify-center px-4 py-10 sm:px-6">
        <header className="w-full text-center">
          <p className="font-mono text-[10px] tracking-[0.2em] text-cyan-400 uppercase">
            PRE-FLIGHT LEAD CONVERSION GATES
          </p>
          <h1 className="mt-3 text-2xl font-bold tracking-tight text-white sm:text-3xl">
            AI Growth & Strategy Specialist
          </h1>
          <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-slate-400">
            Evaluate your environment profile against Ironframe deployment baselines and queue a
            tailored integration pitch for operator review.
          </p>
        </header>

        <section className="mt-8 w-full">
          <SalesAgentPortalContent centered />
        </section>

        <footer className="mt-10 flex w-full flex-col items-center gap-3 border-t border-slate-900 pt-6 text-center font-mono text-[9px] tracking-wider text-slate-600 sm:flex-row sm:justify-between sm:text-left">
          <span>PORTAL_REF: AM_CONVERT_V1</span>
          <span>SYSTEM STATE: DETERMINISTIC</span>
        </footer>

        <p className="mt-6 flex flex-col items-center gap-2 text-center text-sm text-slate-500">
          <Link href="/" className="text-cyan-400 hover:text-cyan-300">
            ← Return to homepage
          </Link>
          <Link href="/dashboard/operations" className="text-slate-500 hover:text-cyan-400">
            Operations hub (GLOBAL_ADMIN)
          </Link>
        </p>
      </div>
    </main>
  );
}
