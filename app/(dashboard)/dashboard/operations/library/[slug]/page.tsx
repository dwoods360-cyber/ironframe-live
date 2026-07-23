import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import DesignPartnerOrderFormClient from "@/app/(dashboard)/dashboard/operations/library/DesignPartnerOrderFormClient";
import { canUsePerimeterWorkforceFromSession } from "@/app/lib/auth/perimeterWorkforceAccess";
import { loadOperatorLibraryMarkdown } from "@/app/lib/server/loadOperatorLibraryMarkdown";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const doc = await loadOperatorLibraryMarkdown(slug);
  return {
    title: doc ? `${doc.title} | Operator library` : "Operator library",
  };
}

export default async function OperatorLibraryDocPage({ params }: PageProps) {
  const allowed = await canUsePerimeterWorkforceFromSession();
  if (!allowed) {
    redirect("/unauthorized");
  }

  const { slug } = await params;
  const doc = await loadOperatorLibraryMarkdown(slug);
  if (!doc) notFound();

  return (
    <div className="min-h-screen bg-[#020617] p-4 text-slate-100 sm:p-6">
      <div className="mx-auto max-w-3xl space-y-4">
        <header className="space-y-2 border-b border-slate-800 pb-4">
          <div className="flex flex-wrap gap-3 text-xs">
            <Link href="/dashboard/operations/library" className="text-cyan-300 hover:underline">
              ← Operator library
            </Link>
            <Link href="/dashboard/operations" className="text-cyan-300 hover:underline">
              Ops Hub
            </Link>
          </div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-cyan-400">
            {doc.file}
          </p>
          <h1 className="text-2xl font-bold text-white">{doc.title}</h1>
          <p className="text-sm text-slate-400">{doc.summary}</p>
          {slug === "order-form" ? (
            <div className="mt-3 flex flex-wrap gap-2 rounded-lg border border-emerald-900/40 bg-emerald-950/20 p-3">
              <p className="w-full font-mono text-[10px] font-bold uppercase tracking-widest text-emerald-400">
                After criteria are written + partner lock word
              </p>
              <p className="w-full text-xs text-slate-300">
                Use the interactive form below (suggest from LIVE recap → partner says{" "}
                <code className="text-cyan-300">AGREED</code> → freeze). Then hand off to{" "}
                <code className="text-cyan-300">BUSINESS_ADMIN</code> /{" "}
                <code className="text-cyan-300">GLOBAL_ADMIN</code> for provision with a{" "}
                <strong className="text-slate-100">client-owned</strong> operator email, then send
                the tenant Path B link — never <code className="text-cyan-300">/pricing</code>. GTM
                host does not collapse into admin on this beat.
              </p>
              <Link
                href="/admin/onboarding"
                className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-600"
                title="SoD: provision is BUSINESS_ADMIN / GLOBAL_ADMIN"
              >
                Provision Path B (admin)
              </Link>
              <Link
                href="/dashboard/operations/workflow-review#after-yes"
                className="rounded-lg border border-emerald-700/70 px-3 py-2 text-xs font-semibold text-emerald-100 hover:bg-emerald-950/50"
              >
                Back to LIVE after-yes
              </Link>
            </div>
          ) : null}
          {slug === "icp-shortlist" || slug === "design-partner-icp-shortlist" ? (
            <div className="mt-3 space-y-2 rounded-lg border border-amber-900/40 bg-amber-950/20 p-3">
              <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-amber-400">
                C3 — Log touch (§D)
              </p>
              <p className="text-xs text-slate-300">
                Jump to{" "}
                <a href="#section-d" className="font-medium text-cyan-300 hover:underline">
                  §D Ironleads / Scout queue
                </a>
                . This page is <strong className="text-slate-100">read-only</strong> — after DISPATCH,
                record the touch in your run log and/or ask Cursor to update the shortlist markdown in
                git. Canonical library slug is{" "}
                <code className="text-cyan-300">icp-shortlist</code> (filename-style URLs now alias
                here).
              </p>
              <Link
                href="/dashboard/admin/approvals?kind=SALES"
                className="inline-flex rounded-lg border border-amber-700/70 px-3 py-2 text-xs font-semibold text-amber-100 hover:bg-amber-950/50"
              >
                ← Sales Approvals
              </Link>
            </div>
          ) : null}
        </header>

        {slug === "order-form" ? <DesignPartnerOrderFormClient /> : null}

        <article className="operator-library-prose rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-5 text-sm leading-relaxed text-slate-200 sm:px-6">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              h1: ({ children }) => (
                <h1 className="mb-3 mt-6 text-xl font-bold text-white first:mt-0">{children}</h1>
              ),
              h2: ({ children }) => {
                const text = String(
                  Array.isArray(children)
                    ? children.map((c) => (typeof c === "string" ? c : "")).join("")
                    : children ?? "",
                );
                const id = /^D\.\s/i.test(text.trim())
                  ? "section-d"
                  : undefined;
                return (
                  <h2
                    id={id}
                    className="mb-2 mt-6 scroll-mt-24 text-lg font-semibold text-white"
                  >
                    {children}
                  </h2>
                );
              },
              h3: ({ children }) => (
                <h3 className="mb-2 mt-4 text-base font-semibold text-cyan-100">{children}</h3>
              ),
              p: ({ children }) => <p className="mb-3 text-slate-300">{children}</p>,
              ul: ({ children }) => (
                <ul className="mb-3 list-disc space-y-1 pl-5 text-slate-300">{children}</ul>
              ),
              ol: ({ children }) => (
                <ol className="mb-3 list-decimal space-y-1 pl-5 text-slate-300">{children}</ol>
              ),
              li: ({ children }) => <li className="leading-relaxed">{children}</li>,
              a: ({ href, children }) => (
                <a
                  href={href}
                  className="text-cyan-300 underline-offset-2 hover:underline"
                  {...(href?.startsWith("http")
                    ? { target: "_blank", rel: "noreferrer" }
                    : {})}
                >
                  {children}
                </a>
              ),
              code: ({ children, className }) => {
                const block = Boolean(className);
                if (block) {
                  return (
                    <code className="mb-3 block overflow-x-auto rounded-lg border border-slate-800 bg-slate-950 p-3 font-mono text-xs text-emerald-200">
                      {children}
                    </code>
                  );
                }
                return (
                  <code className="rounded bg-slate-950 px-1 py-0.5 font-mono text-[12px] text-emerald-200">
                    {children}
                  </code>
                );
              },
              table: ({ children }) => (
                <div className="mb-4 overflow-x-auto">
                  <table className="w-full border-collapse text-left text-xs text-slate-300">
                    {children}
                  </table>
                </div>
              ),
              th: ({ children }) => (
                <th className="border border-slate-700 bg-slate-950 px-2 py-1.5 font-semibold text-slate-100">
                  {children}
                </th>
              ),
              td: ({ children }) => (
                <td className="border border-slate-800 px-2 py-1.5 align-top">{children}</td>
              ),
              hr: () => <hr className="my-6 border-slate-800" />,
              blockquote: ({ children }) => (
                <blockquote className="mb-3 border-l-2 border-cyan-700 pl-3 text-slate-400">
                  {children}
                </blockquote>
              ),
            }}
          >
            {doc.markdown}
          </ReactMarkdown>
        </article>
      </div>
    </div>
  );
}
