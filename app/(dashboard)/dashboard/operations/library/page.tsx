import Link from "next/link";
import { redirect } from "next/navigation";

import { canUsePerimeterWorkforceFromSession } from "@/app/lib/auth/perimeterWorkforceAccess";
import { OPERATOR_LIBRARY_SETS } from "@/app/lib/operations/operatorLibraryCatalog";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Operator library | Ironframe Operations",
  description: "Directory of design-partner operator playbooks, talk tracks, and Ops tools.",
};

export default async function OperatorLibraryPage() {
  const allowed = await canUsePerimeterWorkforceFromSession();
  if (!allowed) {
    redirect("/unauthorized");
  }

  return (
    <div className="min-h-screen bg-[#020617] p-4 text-slate-100 sm:p-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="space-y-2 border-b border-slate-800 pb-4">
          <div className="flex flex-wrap gap-3 text-xs">
            <Link href="/dashboard/operations" className="text-cyan-300 hover:underline">
              ← Operations hub
            </Link>
            <Link
              href="/dashboard/operations/workflow-review"
              className="text-cyan-300 hover:underline"
            >
              LIVE call assist
            </Link>
            <Link
              href="/dashboard/admin/approvals?kind=SALES"
              className="text-cyan-300 hover:underline"
            >
              Approvals SALES
            </Link>
          </div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-cyan-400">
            Operator library
          </p>
          <h1 className="text-2xl font-bold text-white">Playbooks & document sets</h1>
          <p className="max-w-2xl text-sm text-slate-400">
            One directory for design-partner GTM docs and the Ops tools they point at. New to terms?{" "}
            <Link
              href="/dashboard/operations/library/gtm-operator-glossary"
              className="text-cyan-300 hover:underline"
            >
              GTM operator glossary
            </Link>
            . Before first DISPATCH, run{" "}
            <Link
              href="/dashboard/operations/library/pre-outreach-run-order"
              className="text-cyan-300 hover:underline"
            >
              Pre-outreach dry-run
            </Link>
            .
          </p>
        </header>

        <div className="space-y-5">
          {OPERATOR_LIBRARY_SETS.map((set) => (
            <section
              key={set.id}
              className="rounded-xl border border-slate-800 bg-slate-900/60 p-5"
            >
              <h2 className="text-lg font-semibold text-white">{set.title}</h2>
              <p className="mt-1 text-sm text-slate-400">{set.summary}</p>
              <ul className="mt-4 space-y-2">
                {set.items.map((item) => {
                  const href =
                    item.kind === "markdown"
                      ? `/dashboard/operations/library/${item.slug}`
                      : item.href;
                  const external = item.kind === "href" ? Boolean(item.external) : false;
                  return (
                    <li key={item.slug}>
                      <Link
                        href={href}
                        {...(external
                          ? { target: "_blank", rel: "noreferrer" }
                          : {})}
                        className="block rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2.5 hover:border-cyan-700/60"
                      >
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <span className="text-sm font-medium text-cyan-100">{item.title}</span>
                          <span className="font-mono text-[10px] uppercase tracking-widest text-slate-500">
                            {item.kind === "markdown" ? "doc" : external ? "open" : "tool"}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-slate-400">{item.summary}</p>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
