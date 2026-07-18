import Link from "next/link";

import {
  CONTROL_TOOL_DISCLAIMER,
  type ControlTool,
} from "@/app/lib/marketing/controlTools";
import { SALES_CONTACT_PATH } from "@/config/registration";
import { WORKFLOW_REVIEW_CTA_MINUTES } from "@/lib/ironframeProductKnowledge/commercial";

import PublicApexNav from "./PublicApexNav";

type ControlToolPageProps = {
  tool: ControlTool;
};

export default function ControlToolPage({ tool }: ControlToolPageProps) {
  return (
    <>
      <PublicApexNav />
      <main
        className="ironframe-public-funnel min-h-screen bg-slate-950 px-4 py-10 text-slate-100 sm:px-6"
        aria-labelledby="control-tool-title"
      >
        <div className="mx-auto max-w-4xl">
          <nav className="mb-8 text-sm text-slate-400" aria-label="Breadcrumb">
            <Link href="/tools" className="transition-colors hover:text-teal-300">
              Tools
            </Link>
            <span aria-hidden="true"> / </span>
            <span className="text-slate-300">{tool.shortTitle}</span>
          </nav>

          <header className="border-b border-slate-800 pb-9">
            <p className="font-mono text-xs font-semibold uppercase tracking-widest text-teal-400">
              Free public control tool
            </p>
            <h1 id="control-tool-title" className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              {tool.title}
            </h1>
            <p className="mt-4 max-w-3xl text-lg leading-relaxed text-slate-300">{tool.summary}</p>
            <p className="mt-4 max-w-3xl text-sm leading-relaxed text-slate-400">{tool.intro}</p>
            <p className="mt-5 inline-flex rounded border border-amber-500/30 bg-amber-950/25 px-3 py-2 text-xs font-medium text-amber-100">
              {CONTROL_TOOL_DISCLAIMER}
            </p>
          </header>

          <section className="grid gap-4 border-b border-slate-800 py-8 sm:grid-cols-2" aria-label="Tool guidance">
            <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-5">
              <h2 className="font-mono text-xs font-semibold uppercase tracking-widest text-teal-300">Use when</h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-300">{tool.useWhen}</p>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-5">
              <h2 className="font-mono text-xs font-semibold uppercase tracking-widest text-teal-300">Output</h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-300">{tool.output}</p>
            </div>
          </section>

          <section className="space-y-8 py-10" aria-labelledby="checklist-heading">
            <div>
              <p className="font-mono text-xs font-semibold uppercase tracking-widest text-teal-400">Operator checklist</p>
              <h2 id="checklist-heading" className="mt-2 text-2xl font-semibold">
                Work through the prompts and retain the evidence references.
              </h2>
            </div>
            {tool.sections.map((section, sectionIndex) => (
              <section
                key={section.title}
                className="rounded-lg border border-slate-800 bg-slate-900/40 p-5 sm:p-6"
                aria-labelledby={`section-${sectionIndex}`}
              >
                <p className="font-mono text-[11px] uppercase tracking-widest text-slate-500">
                  Section {sectionIndex + 1}
                </p>
                <h3 id={`section-${sectionIndex}`} className="mt-1 text-lg font-semibold text-slate-100">
                  {section.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">{section.description}</p>
                <ol className="mt-5 space-y-4">
                  {section.items.map((item, itemIndex) => (
                    <li key={item.prompt} className="border-t border-slate-800 pt-4 first:border-t-0 first:pt-0">
                      <div className="flex gap-3">
                        <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded border border-teal-700 text-[10px] text-teal-300">
                          {itemIndex + 1}
                        </span>
                        <div>
                          <p className="text-sm font-medium leading-relaxed text-slate-100">{item.prompt}</p>
                          <p className="mt-1 text-xs leading-relaxed text-slate-400">
                            <span className="font-semibold text-slate-300">Evidence to retain: </span>
                            {item.evidence}
                          </p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ol>
              </section>
            ))}
          </section>

          {tool.source ? (
            <aside className="rounded-lg border border-cyan-900/70 bg-cyan-950/20 p-5" aria-labelledby="source-heading">
              <h2 id="source-heading" className="font-mono text-xs font-semibold uppercase tracking-widest text-cyan-300">
                Reference
              </h2>
              <p className="mt-2 text-sm font-medium text-slate-100">
                <a href={tool.source.href} className="underline decoration-cyan-600 underline-offset-4 hover:text-cyan-200">
                  {tool.source.label}
                </a>
              </p>
              <p className="mt-2 text-sm leading-relaxed text-slate-300">{tool.source.note}</p>
            </aside>
          ) : null}

          <section className="mt-10 border-t border-slate-800 py-10" aria-labelledby="review-heading">
            <h2 id="review-heading" className="text-xl font-semibold">
              Want a second set of eyes on the workflow?
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">
              Bring one completed worksheet or checklist. Ironframe can help map the handoffs, evidence,
              ownership, and remediation steps into a workable operating process.
            </p>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <Link
                href={SALES_CONTACT_PATH}
                className="inline-flex h-11 items-center justify-center rounded-md bg-indigo-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500"
              >
                Request a {WORKFLOW_REVIEW_CTA_MINUTES} min workflow review
              </Link>
              <Link
                href="/product-demo"
                className="inline-flex h-11 items-center justify-center rounded-md border border-slate-700 px-5 text-sm font-medium text-slate-200 transition-colors hover:border-slate-500 hover:text-white"
              >
                View product demo
              </Link>
              <Link
                href={tool.solutionHref}
                className="inline-flex h-11 items-center justify-center rounded-md border border-slate-700 px-5 text-sm font-medium text-slate-200 transition-colors hover:border-slate-500 hover:text-white"
              >
                {tool.solutionLabel}
              </Link>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
