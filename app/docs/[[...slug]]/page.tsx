import fs from "fs";
import { notFound } from "next/navigation";
import DocsSidebar from "./DocsSidebar";
import DocsMarkdown from "./DocsMarkdown";
import { resolveDocPath, walkMarkdownSlugs, DOCS_ROOT } from "@/lib/docsNavigation";

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
  const slugArray = resolvedParams.slug?.length ? resolvedParams.slug : ["hub"];
  const fullDocPath = resolveDocPath(slugArray);

  if (!fullDocPath) {
    notFound();
  }

  const fileContent = fs.readFileSync(fullDocPath, "utf8");

  return (
    <div className="flex min-h-full bg-slate-950 font-sans text-slate-100 selection:bg-teal-500/30 selection:text-slate-950">
      <DocsSidebar currentSlug={slugArray} />

      <main className="mx-auto min-h-full max-w-4xl flex-1 overflow-y-auto px-8 py-12 lg:py-16">
        <p className="mb-6 font-mono text-[10px] uppercase tracking-widest text-slate-500">
          docs / {slugArray.join("/")}.md
        </p>

        <article className="prose prose-invert max-w-none font-sans">
          <DocsMarkdown content={fileContent} />
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
  );
}
