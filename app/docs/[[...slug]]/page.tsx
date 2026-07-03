import { redirect } from "next/navigation";

import CommercialEntitlementHoldPanel from "@/app/components/billing/CommercialEntitlementHoldPanel";
import DocsChrome from "./DocsChrome";
import CompilationIngressPortal from "./CompilationIngressPortal";
import DocsMarkdown from "./DocsMarkdown";
import {
  buildAppDocsNavigation,
  groupAppDocsNavigation,
} from "@/app/lib/server/appDocsNavigation";
import { enforceCommercialCorpusGateOrRedirect } from "@/app/lib/server/commercialCorpusAccess";
import { dbKeyToSlugSegments, inferReadingLevelFromSlug } from "@/lib/appDocumentSlug";
import {
  formatOperatorDocTitle,
  isOperatorFacingReadingLevel,
  prepareDocContentForDisplay,
} from "@/lib/docsContentDecoupling";
import { loadAppDocumentForReader } from "@/app/lib/server/loadAppDocumentForReader";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Documentation | Ironframe",
  description: "Ironframe product, technical, and QA documentation hub.",
};

interface DocsPageProps {
  params: Promise<{
    slug?: string[];
  }>;
  searchParams: Promise<{
    embed?: string;
  }>;
}

function isAppDocumentClientReady(): boolean {
  return typeof prisma.appDocument?.findUnique === "function";
}

function prismaClientNotReadyPanel() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#030712] p-6 text-slate-100">
      <div className="w-full max-w-xl rounded-xl border border-amber-500/30 bg-amber-950/20 p-6 font-mono text-xs text-amber-200 shadow-2xl backdrop-blur-md">
        <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-amber-400">
          Prisma client out of date
        </h3>
        <p className="leading-relaxed">
          The <code>AppDocument</code> delegate is missing from the active client. Regenerate and
          restart:
        </p>
        <pre className="mt-3 overflow-x-auto rounded-lg border border-amber-500/10 bg-slate-950/60 p-3 text-slate-400">
          {`npx prisma generate\nnpm run dev`}
        </pre>
      </div>
    </div>
  );
}

function resolveTargetSlug(slugArray: string[]): string {
  const joined = slugArray.join("/");
  if (joined === "" || joined.toLowerCase() === "readme") {
    return "readme";
  }
  return joined.toLowerCase();
}

export default async function DocsCatchAllPage({ params, searchParams }: DocsPageProps) {
  if (!isAppDocumentClientReady()) {
    return prismaClientNotReadyPanel();
  }

  const resolvedParams = await params;
  const resolvedSearch = await searchParams;
  const embedded = resolvedSearch.embed === "1";
  const slugArray = resolvedParams.slug ?? [];

  if (slugArray.length === 1 && slugArray[0]?.toLowerCase() === "hub") {
    redirect("/docs/README");
  }

  if (slugArray.length === 1 && slugArray[0]?.toLowerCase() === "user-guide") {
    redirect("/docs/user-manuals/user-guide");
  }

  const targetSlug = resolveTargetSlug(slugArray);
  const currentSlug = dbKeyToSlugSegments(targetSlug);
  const loginNextPath =
    slugArray.length === 0 ? "/docs/README" : `/docs/${slugArray.join("/")}`;

  let navSections: Awaited<ReturnType<typeof groupAppDocsNavigation>> = [];
  try {
    const navItems = await buildAppDocsNavigation();
    navSections = await groupAppDocsNavigation(navItems);
  } catch (navError) {
    console.error("[Docs Navigation Failure]", navError);
  }

  let docRecord = null;
  try {
    docRecord = await loadAppDocumentForReader(targetSlug);
  } catch (dbError) {
    console.error("[Docs DB Connection Failure]", dbError);
    return (
      <DocsChrome currentSlug={currentSlug} navSections={navSections} embedded={embedded}>
        <div className="mx-auto max-w-xl rounded-xl border border-amber-500/30 bg-amber-950/20 p-6 font-mono text-xs text-amber-200 shadow-2xl backdrop-blur-md">
          <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-amber-400">
            System subsurface disconnected
          </h3>
          <p className="leading-relaxed">
            The documentation compilation engine failed to interface with your PostgreSQL core
            cluster storage array.
          </p>
          <p className="mt-3 border-t border-amber-500/10 pt-2 text-slate-500">
            Check runtime cluster allocations and verified environment bindings.
          </p>
        </div>
      </DocsChrome>
    );
  }

  if (!docRecord) {
    const missingDocOperatorView = isOperatorFacingReadingLevel(
      inferReadingLevelFromSlug(targetSlug),
    );
    const corpusGate = await enforceCommercialCorpusGateOrRedirect(
      inferReadingLevelFromSlug(targetSlug),
      loginNextPath,
    );
    return (
      <DocsChrome
        currentSlug={currentSlug}
        navSections={navSections}
        audience={missingDocOperatorView ? "operator" : "publisher"}
        embedded={embedded}
      >
        {corpusGate.status === "billing_hold" ? (
          <CommercialEntitlementHoldPanel billingStatus={corpusGate.billingStatus} />
        ) : (
          <CompilationIngressPortal targetSlug={targetSlug} />
        )}
      </DocsChrome>
    );
  }

  const operatorView = isOperatorFacingReadingLevel(docRecord.readingLevel);
  const corpusGate = await enforceCommercialCorpusGateOrRedirect(
    docRecord.readingLevel,
    loginNextPath,
  );
  const documentContent = prepareDocContentForDisplay(docRecord.content, {
    readingLevel: docRecord.readingLevel,
    title: docRecord.title,
  });
  const displayTitle = operatorView
    ? formatOperatorDocTitle(docRecord.title)
    : docRecord.title;

  return (
    <DocsChrome
      currentSlug={currentSlug}
      navSections={navSections}
      audience={operatorView ? "operator" : "publisher"}
      embedded={embedded}
    >
      {corpusGate.status === "billing_hold" ? (
        <CommercialEntitlementHoldPanel billingStatus={corpusGate.billingStatus} />
      ) : (
      <div className="relative mx-auto max-w-4xl overflow-hidden rounded-xl border border-slate-800/80 bg-[#070e20]/40 p-8 shadow-2xl backdrop-blur-md">
        <div className="pointer-events-none absolute inset-0 z-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-30 [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />

        <header className="relative z-10 mb-8 border-b border-slate-800/80 pb-5">
          {operatorView ? (
            <>
              <p className="mb-1 font-mono text-[10px] uppercase tracking-widest text-cyan-400">
                User guide
              </p>
              <h1 className="font-sans text-2xl font-bold tracking-tight text-white">{displayTitle}</h1>
            </>
          ) : (
            <>
              <div className="mb-1 flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-indigo-400">
                <span>DOCUMENTATION HUB</span>
                <span>·</span>
                <span className="text-cyan-400">{docRecord.readingLevel}</span>
              </div>
              <h1 className="font-sans text-2xl font-bold tracking-tight text-white">{displayTitle}</h1>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[10px] text-slate-500">
                <span>REF_PATH: {docRecord.slug}</span>
                <span>SOURCE: {docRecord.source === "database" ? "APP_DOCUMENTS_DB" : "FILESYSTEM_FALLBACK"}</span>
              </div>
            </>
          )}
        </header>

        <article className="prose prose-invert pointer-events-auto relative z-20 max-w-none font-sans prose-a:text-cyan-400 hover:prose-a:text-cyan-300 prose-a:transition-colors">
          <DocsMarkdown content={documentContent} currentSlug={currentSlug} />
        </article>
      </div>
      )}
    </DocsChrome>
  );
}
