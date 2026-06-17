import fs from "fs";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import DocsSidebar from "./DocsSidebar";
import DocsMarkdown from "./DocsMarkdown";
import {
  resolveDocPath,
  walkMarkdownSlugs,
  DOCS_ROOT,
} from "@/lib/docsNavigation";
import { sanitizeDocSlugSegments } from "@/lib/docsLinkNormalization";
/** FS-backed markdown pages — literal required by Next.js; policy in docsRouteRuntime.ts. */
export const dynamic = "force-dynamic";

interface DocsPageProps {
  params: Promise<{ slug?: string[] }>;
}

export async function generateStaticParams() {
  if (!fs.existsSync(DOCS_ROOT)) return [{ slug: [] }];

  const paths = walkMarkdownSlugs(DOCS_ROOT, DOCS_ROOT);
  return [{ slug: [] }, ...paths.map((slug) => ({ slug }))];
}

export const metadata = {
  title: "Documentation | Ironframe",
  description: "Ironframe product, technical, and QA documentation hub.",
};


export default async function DocsPage({ params }: DocsPageProps) {
  const resolvedParams = await params;
  const rawSlug = resolvedParams.slug?.length ? resolvedParams.slug : ["hub"];
  const slugArray = sanitizeDocSlugSegments(rawSlug);

  if (slugArray.length === 1 && slugArray[0]?.toLowerCase() === "readme") {
    redirect("/docs/hub");
  }

  const slugPath = slugArray.join("/");
  const fullDocPath = resolveDocPath(slugArray);

  if (!fullDocPath) {
    notFound();
  }

  const fileContent = fs.readFileSync(fullDocPath, "utf8");

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 font-sans text-slate-100 antialiased selection:bg-teal-500/30 selection:text-slate-950">
      <nav className="sticky top-0 z-50 flex h-14 w-full items-center justify-between border-b border-slate-900 bg-slate-950/80 px-6 backdrop-blur-md">
        <Link
          href="/"
          className="flex items-center gap-3 transition hover:opacity-90"
          data-testid="docs-brand-home-link"
        >
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" aria-hidden />
          <span className="font-mono text-xs font-bold uppercase tracking-widest text-slate-400">
            IRONFRAME CORE <span className="text-slate-700">|</span>{" "}
            <span className="text-teal-400">REFERENCE MANUALS</span>
          </span>
        </Link>

        <Link
          href="/"
          className="flex items-center gap-2 rounded border border-teal-900/50 bg-teal-950/30 px-4 py-1.5 font-mono text-xs font-bold tracking-wider text-teal-400 shadow-sm shadow-teal-950/20 transition-all duration-200 hover:bg-teal-500 hover:text-slate-950"
        >
          ➔ RETURN TO OPERATIONS DASHBOARD
        </Link>
      </nav>

      <div className="flex min-h-0 flex-1">
        <DocsSidebar currentSlug={slugArray} />

        <main className="mx-auto min-h-full max-w-5xl flex-1 overflow-y-auto px-6 py-12 lg:px-8 lg:py-16">
          <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-slate-600">
            SYSTEM FILEPATH: docs/{slugPath}.md
          </p>

          <article className="prose prose-invert max-w-none font-sans">
            <DocsMarkdown content={fileContent} currentSlug={slugArray} />
          </article>

          <div className="mt-12 flex items-center justify-between border-t border-slate-800 pt-8">
            <div>
              <h4 className="text-sm font-semibold text-white">UI/UX & Feature Test Protocol</h4>
              <p className="mt-1 text-xs text-slate-400">
                Download the verified MS Word (.docx) compliance specification file.
              </p>
            </div>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- attachment download, not RSC navigation */}
            <a
              href="/api/docs/download-protocol"
              className="transform rounded bg-teal-500 px-4 py-2 font-mono text-xs font-bold text-slate-950 shadow-lg shadow-teal-500/20 transition-all hover:bg-teal-400 active:scale-95"
            >
              DOWNLOAD PLAYBOOK (.DOCX)
            </a>
          </div>
        </main>
      </div>
    </div>
  );
}
