import fs from "fs";
import path from "path";
import { notFound } from "next/navigation";
import Link from "next/link";

interface DocsPageProps {
  params: Promise<{ slug?: string[] }>;
}

const DOCS_ROOT = path.join(process.cwd(), "docs");

function resolveDocPath(slugSegments: string[]): string | null {
  const relativeDocPath = `${slugSegments.join("/")}.md`;
  const candidate = path.resolve(DOCS_ROOT, relativeDocPath);
  const normalizedRoot = path.resolve(DOCS_ROOT);
  if (candidate !== normalizedRoot && !candidate.startsWith(`${normalizedRoot}${path.sep}`)) {
    return null;
  }
  if (!fs.existsSync(candidate) || !fs.statSync(candidate).isFile()) {
    return null;
  }
  return candidate;
}

function walkMarkdownSlugs(dir: string, root: string): string[][] {
  let results: string[][] = [];
  if (!fs.existsSync(dir)) return results;

  for (const file of fs.readdirSync(dir)) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      results = results.concat(walkMarkdownSlugs(fullPath, root));
    } else if (file.endsWith(".md")) {
      const relativePath = path.relative(root, fullPath);
      const slug = relativePath.replace(/\.md$/i, "").split(path.sep);
      results.push(slug);
    }
  }
  return results;
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
  const slugArray = resolvedParams.slug?.length ? resolvedParams.slug : ["README"];
  const fullDocPath = resolveDocPath(slugArray);

  if (!fullDocPath) {
    notFound();
  }

  const fileContent = fs.readFileSync(fullDocPath, "utf8");
  const docTitle = slugArray[slugArray.length - 1] ?? "README";

  return (
    <div className="flex min-h-full bg-slate-950 text-slate-100 font-sans selection:bg-teal-500 selection:text-slate-950">
      <aside className="hidden w-64 shrink-0 border-r border-slate-800 bg-slate-900/50 p-6 backdrop-blur-md md:block">
        <div className="mb-6">
          <Link
            href="/dashboard"
            className="text-xs font-mono tracking-widest text-teal-400 transition-colors hover:text-teal-300"
          >
            ➔ RETURN TO DASHBOARD
          </Link>
          <h2 className="mt-2 text-lg font-bold text-white">Ironframe Docs</h2>
        </div>
        <nav className="space-y-2">
          <Link
            href="/docs/README"
            className="block text-sm text-slate-400 transition-colors hover:text-white"
          >
            📄 Documentation Hub
          </Link>
          <Link
            href="/docs/end-users/user-guide"
            className="block text-sm text-slate-400 transition-colors hover:text-white"
          >
            📖 User Guide
          </Link>
          <Link
            href="/docs/sales/pricing-and-packaging"
            className="block text-sm text-slate-400 transition-colors hover:text-white"
          >
            💰 Pricing Matrix
          </Link>
          <Link
            href="/docs/technical/api-documentation"
            className="block text-sm text-slate-400 transition-colors hover:text-white"
          >
            🔌 API Specifications
          </Link>
          <Link
            href="/docs/technical/security-and-compliance"
            className="block text-sm text-slate-400 transition-colors hover:text-white"
          >
            🛡 Security & Compliance
          </Link>
        </nav>
      </aside>

      <main className="mx-auto min-h-full max-w-4xl flex-1 overflow-y-auto px-8 py-12 lg:py-16">
        <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-slate-500">
          docs / {slugArray.join("/")}.md
        </p>
        <h1 className="mb-8 text-xl font-bold text-white">{docTitle}</h1>
        <div className="prose prose-invert prose-teal max-w-none">
          <pre className="whitespace-pre-wrap rounded-lg border border-slate-800 bg-slate-900 p-6 font-mono text-xs leading-relaxed text-slate-300 shadow-xl">
            {fileContent}
          </pre>
        </div>

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
