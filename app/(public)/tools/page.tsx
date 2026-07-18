import type { Metadata } from "next";
import Link from "next/link";

import PublicApexNav from "@/app/components/marketing/PublicApexNav";
import { CONTROL_TOOL_DISCLAIMER, CONTROL_TOOLS } from "@/app/lib/marketing/controlTools";

export const metadata: Metadata = {
  title: "Free control tools | Ironframe",
  description:
    "Practical, ungated templates and checklists for cyber risk, evidence readiness, third-party criticality, governance, and AI inventory.",
};

export default function ControlToolsIndexPage() {
  return (
    <>
      <PublicApexNav />
      <main className="ironframe-public-funnel min-h-screen bg-slate-950 px-4 py-10 text-slate-100 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <header className="max-w-3xl">
            <p className="font-mono text-xs font-semibold uppercase tracking-widest text-teal-400">
              Free public control tools
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              Practical templates for control operators
            </h1>
            <p className="mt-4 text-base leading-relaxed text-slate-300">
              Use these worksheets and checklists to organize one decision, one evidence set, or one
              governance conversation. They are public and require no email or account.
            </p>
            <p className="mt-5 inline-flex rounded border border-amber-500/30 bg-amber-950/25 px-3 py-2 text-xs font-medium text-amber-100">
              {CONTROL_TOOL_DISCLAIMER}
            </p>
          </header>

          <section className="mt-10 grid gap-5 md:grid-cols-2" aria-label="Available tools">
            {CONTROL_TOOLS.map((tool) => (
              <article
                key={tool.slug}
                className="flex flex-col rounded-lg border border-slate-800 bg-slate-900/50 p-6 transition-colors hover:border-teal-800"
              >
                <h2 className="text-xl font-semibold text-slate-100">{tool.title}</h2>
                <p className="mt-3 text-sm leading-relaxed text-slate-400">{tool.summary}</p>
                <p className="mt-4 text-xs leading-relaxed text-slate-500">
                  <span className="font-semibold text-slate-400">Best for: </span>
                  {tool.useWhen}
                </p>
                <Link
                  href={`/tools/${tool.slug}`}
                  className="mt-6 inline-flex h-10 items-center justify-center rounded-md border border-teal-800 bg-teal-950/30 px-4 text-sm font-semibold text-teal-100 transition-colors hover:border-teal-600 hover:bg-teal-900/40"
                >
                  Open checklist
                </Link>
              </article>
            ))}
          </section>
        </div>
      </main>
    </>
  );
}
