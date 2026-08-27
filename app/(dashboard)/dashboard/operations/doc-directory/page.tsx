import Link from "next/link";
import { redirect } from "next/navigation";

import { canUsePerimeterWorkforceFromSession } from "@/app/lib/auth/perimeterWorkforceAccess";
import { DOC_DIRECTORY_PLANES } from "@/app/lib/operations/docDirectoryPlanes";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Doc Directory | Ironframe Operations",
  description:
    "Master front door to Ironframe documentation planes — Ops library, product docs, Publishing, research.",
};

export default async function DocDirectoryPage() {
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
              href="/dashboard/operations/library"
              className="text-cyan-300 hover:underline"
            >
              Operator library
            </Link>
            <Link
              href="/dashboard/operations/library/ops-surface-map"
              className="text-cyan-300 hover:underline"
            >
              Ops surface map
            </Link>
          </div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-cyan-400">
            Doc Directory
          </p>
          <h1 className="text-2xl font-bold text-white">Documentation planes</h1>
          <p className="max-w-2xl text-sm text-slate-400">
            One front door to every major doc surface. This is a{" "}
            <span className="text-slate-300">map of planes</span> — not a dump of every markdown
            file. Each plane stays curated for its audience.
          </p>
        </header>

        <ul className="space-y-3">
          {DOC_DIRECTORY_PLANES.map((plane) => (
            <li key={plane.id}>
              <Link
                href={plane.href}
                {...(plane.external ? { target: "_blank", rel: "noreferrer" } : {})}
                className="block rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3.5 hover:border-cyan-700/60"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-base font-medium text-cyan-100">{plane.title}</span>
                  <span className="font-mono text-[10px] uppercase tracking-widest text-slate-500">
                    {plane.audience}
                  </span>
                </div>
                <p className="mt-1.5 text-sm text-slate-400">{plane.summary}</p>
                <p className="mt-2 font-mono text-[11px] text-slate-600">
                  {plane.href}
                  {plane.external ? " ↗" : ""}
                </p>
              </Link>
            </li>
          ))}
        </ul>

        <p className="text-xs text-slate-500">
          Missing a GTM playbook inside the Operator library? Add it to{" "}
          <span className="font-mono text-slate-400">operatorLibraryCatalog.ts</span> — this
          directory only links planes, not every{" "}
          <span className="font-mono text-slate-400">docs/sales/*.md</span> file.
        </p>
      </div>
    </div>
  );
}
