import GovernanceFrameBrandLockup from "@/app/components/governanceFrame/GovernanceFrameBrandLockup";
import {
  ResearchBasePathProvider,
  ResearchLink,
} from "@/app/components/governanceFrame/ResearchBasePath";

const NAV = [
  { path: "/research-papers", label: "Research papers" },
  { path: "/briefings", label: "Briefings" },
  { path: "/series", label: "Series" },
  { path: "/newsletters", label: "Newsletters" },
  { path: "/methodology", label: "Methodology" },
  { path: "/editorial-standards", label: "Editorial standards" },
  { path: "/operating-outline", label: "Operating outline" },
  { path: "/sources-and-corrections", label: "Sources & corrections" },
  { path: "/about", label: "About" },
] as const;

type ResearchSiteChromeProps = {
  children: React.ReactNode;
  /** Empty on research/brief hosts; `/gf-research` when previewing on the app host. */
  basePath?: string;
  eyebrow?: string;
  showIntro?: boolean;
};

export default function ResearchSiteChrome({
  children,
  basePath = "",
  eyebrow = "Governance Frame Research",
  showIntro = true,
}: ResearchSiteChromeProps) {
  return (
    <ResearchBasePathProvider basePath={basePath}>
      <div className="min-h-screen bg-slate-950 text-slate-100">
        <header className="border-b border-slate-800 bg-slate-950/95 backdrop-blur">
          <div className="mx-auto flex max-w-4xl flex-col gap-4 px-6 py-8">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.28em] text-slate-500">
              {eyebrow}
            </p>
            <ResearchLink href="/" className="w-fit no-underline">
              <GovernanceFrameBrandLockup />
            </ResearchLink>
            {showIntro ? (
              <div className="max-w-2xl space-y-2">
                <p className="font-sans text-sm leading-relaxed text-slate-300">
                  Independent governance research and executive education — vendor-neutral,
                  evidence-based, institutionally credible.
                </p>
                <p className="font-mono text-[10px] uppercase tracking-wider text-slate-500">
                  Governance Frame Research · editorially independent
                </p>
              </div>
            ) : null}
            <nav aria-label="Governance Frame sections" className="flex flex-wrap gap-x-4 gap-y-2">
              {NAV.map((item) => (
                <ResearchLink
                  key={item.path}
                  href={item.path}
                  className="font-mono text-[10px] uppercase tracking-widest text-slate-400 hover:text-slate-200"
                >
                  {item.label}
                </ResearchLink>
              ))}
            </nav>
          </div>
        </header>
        <div className="mx-auto max-w-4xl px-6 py-10">{children}</div>
        <footer className="border-t border-slate-800">
          <div className="mx-auto max-w-4xl space-y-2 px-6 py-8 font-mono text-[10px] uppercase tracking-wider text-slate-600">
            <p>
              Governance Frame research is evidence-based institutional analysis. References to
              Ironframe products or architecture are clearly labeled and do not represent regulatory
              requirements.
            </p>
            <p>
              <ResearchLink href="/about" className="text-slate-400 hover:text-slate-200">
                About the publication
              </ResearchLink>
            </p>
          </div>
        </footer>
      </div>
    </ResearchBasePathProvider>
  );
}
