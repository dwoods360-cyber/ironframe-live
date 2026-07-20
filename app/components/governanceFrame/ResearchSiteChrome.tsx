import type { CSSProperties, ReactNode } from "react";

import GovernanceFrameBrandLockup from "@/app/components/governanceFrame/GovernanceFrameBrandLockup";
import {
  ResearchBasePathProvider,
  ResearchLink,
} from "@/app/components/governanceFrame/ResearchBasePath";

const NAV = [
  { path: "/research-papers", label: "Papers" },
  { path: "/briefings", label: "Briefings" },
  { path: "/series", label: "Series" },
  { path: "/newsletters", label: "Newsletters" },
  { path: "/methodology", label: "Methodology" },
  { path: "/editorial-standards", label: "Standards" },
  { path: "/sources-and-corrections", label: "Sources" },
  { path: "/training", label: "Training" },
  { path: "/about", label: "About" },
] as const;

type ResearchSiteChromeProps = {
  children: ReactNode;
  /** Empty on research/brief hosts; `/gf-research` when previewing on the app host. */
  basePath?: string;
};

/**
 * Research-institute shell — ink + teal + soft aqua paper (not grayscale SaaS).
 * Tokens are scoped to `.gf-research-site` so Ironframe product chrome stays untouched.
 */
export default function ResearchSiteChrome({
  children,
  basePath = "",
}: ResearchSiteChromeProps) {
  return (
    <ResearchBasePathProvider basePath={basePath}>
      <div
        className="gf-research-site min-h-screen text-[var(--gf-ink)]"
        style={
          {
            "--gf-ink": "#062a36",
            "--gf-ink-soft": "#164556",
            "--gf-paper": "#e7f3f4",
            "--gf-paper-elevated": "#f7fcfc",
            "--gf-line": "#9fc4c8",
            "--gf-muted": "#3d6a73",
            "--gf-accent": "#0d8a7f",
            "--gf-accent-deep": "#0a5c56",
            "--gf-accent-glow": "rgba(13, 138, 127, 0.22)",
            "--gf-brass": "#b08d3a",
            backgroundColor: "var(--gf-paper)",
            backgroundImage: [
              "radial-gradient(900px 420px at 8% -8%, rgba(13,138,127,0.28), transparent 58%)",
              "radial-gradient(700px 380px at 96% 4%, rgba(176,141,58,0.14), transparent 52%)",
              "linear-gradient(165deg, #d4ecee 0%, var(--gf-paper) 42%, #dceef0 100%)",
            ].join(", "),
          } as CSSProperties
        }
      >
        <style>{`
          @keyframes gf-pulse {
            0%, 100% { opacity: 0.55; transform: translate(-50%, -50%) scale(1); }
            50% { opacity: 1; transform: translate(-50%, -50%) scale(1.15); }
          }
          @keyframes gf-rise {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .gf-research-site .gf-rise { animation: gf-rise 0.7s ease-out both; }
          .gf-research-site .gf-rise-delay { animation: gf-rise 0.75s ease-out 0.12s both; }
          .gf-research-site .gf-rise-delay-2 { animation: gf-rise 0.8s ease-out 0.22s both; }
          .gf-research-site a:focus-visible {
            outline: 2px solid var(--gf-accent);
            outline-offset: 3px;
          }
        `}</style>

        <div
          className="h-1 w-full"
          style={{
            background:
              "linear-gradient(90deg, var(--gf-accent-deep), var(--gf-accent) 45%, var(--gf-brass))",
          }}
          aria-hidden
        />

        <header className="border-b border-[var(--gf-line)]/70 bg-[color-mix(in_srgb,var(--gf-paper-elevated)_82%,transparent)] backdrop-blur-md">
          <div className="mx-auto flex max-w-5xl flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:py-6">
            <ResearchLink href="/" className="w-fit shrink-0 no-underline">
              <GovernanceFrameBrandLockup variant="research" />
            </ResearchLink>
            <nav
              aria-label="Governance Frame sections"
              className="flex flex-wrap gap-x-4 gap-y-2 sm:justify-end"
            >
              {NAV.map((item) => (
                <ResearchLink
                  key={item.path}
                  href={item.path}
                  className="font-[family-name:var(--font-gf-sans)] text-[13px] font-semibold text-[var(--gf-ink-soft)] no-underline transition hover:text-[var(--gf-accent-deep)]"
                >
                  {item.label}
                </ResearchLink>
              ))}
            </nav>
          </div>
        </header>

        <main className="mx-auto max-w-5xl px-6 py-10 sm:py-12">{children}</main>

        <footer className="border-t border-[var(--gf-line)] bg-[color-mix(in_srgb,var(--gf-accent-deep)_12%,var(--gf-paper))]">
          <div className="mx-auto flex max-w-5xl flex-col gap-3 px-6 py-8 font-[family-name:var(--font-gf-sans)] text-xs leading-relaxed text-[var(--gf-muted)] sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-xl space-y-1">
              <p className="font-[family-name:var(--font-gf-serif)] text-sm text-[var(--gf-ink)]">
                Governance Frame Research
              </p>
              <p>
                Evidence-based institutional analysis. References to Ironframe products or
                architecture are labeled and are not regulatory requirements.
              </p>
            </div>
            <p>
              <ResearchLink
                href="/training"
                className="font-semibold text-[var(--gf-accent-deep)] no-underline hover:text-[var(--gf-accent)]"
              >
                Training / GFP
              </ResearchLink>
              {" · "}
              <ResearchLink
                href="/about"
                className="font-semibold text-[var(--gf-accent-deep)] no-underline hover:text-[var(--gf-accent)]"
              >
                About
              </ResearchLink>
              {" · "}
              <ResearchLink
                href="/sources-and-corrections"
                className="font-semibold text-[var(--gf-accent-deep)] no-underline hover:text-[var(--gf-accent)]"
              >
                Sources &amp; corrections
              </ResearchLink>
            </p>
          </div>
        </footer>
      </div>
    </ResearchBasePathProvider>
  );
}
