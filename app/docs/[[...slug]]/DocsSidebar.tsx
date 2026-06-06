import Link from "next/link";

interface DocsSidebarProps {
  currentSlug: string[];
}

function isActive(currentSlug: string[], target: string[]): boolean {
  if (currentSlug.length !== target.length) return false;
  return currentSlug.every((segment, index) => segment === target[index]);
}

function linkClass(active: boolean, accent = false): string {
  if (active) {
    return accent
      ? "block text-sm font-semibold text-teal-400 transition-colors hover:text-teal-300"
      : "block text-sm font-semibold text-teal-400 transition-colors hover:text-white";
  }
  return "block text-sm text-slate-400 transition-colors hover:text-white";
}

const hubHtmlLinkClass =
  "block text-sm text-slate-400 transition-colors hover:text-teal-300";

const HUB_TRACK1 = [
  {
    label: "Chapter 1: Product Core & Monopolies",
    href: "/docs/product/vision_and_overview_track1.html",
  },
  {
    label: "Chapter 2: Automated Self-Healing Labs",
    href: "/docs/support/self_healing_guide_track1.html",
  },
  {
    label: "Chapter 3: Visual Data Ingress Systems",
    href: "/docs/technical/integration_basics_track1.html",
  },
  {
    label: "High School Index Portal",
    href: "/docs/training/high-school/index.html",
  },
] as const;

const HUB_TRACK2 = [
  {
    label: "Chapter 1: Enterprise Business Specifications",
    href: "/docs/product/business_plan_spec_track2.html",
  },
  {
    label: "Chapter 2: Multi-Agent Triage Runbooks",
    href: "/docs/support/operations_triage_spec.html",
  },
  {
    label: "Chapter 3: BigInt Data Schema Contracts",
    href: "/docs/technical/data_dictionary_and_api_track2.html",
  },
  {
    label: "Professional Index Portal",
    href: "/docs/training/professional/index.html",
  },
] as const;

export default function DocsSidebar({ currentSlug }: DocsSidebarProps) {
  return (
    <aside className="hidden w-64 shrink-0 border-r border-slate-800 bg-slate-900/30 p-6 md:block">
      <div className="mb-6">
        <Link
          href="/dashboard"
          className="text-xs font-mono tracking-widest text-teal-400 transition-colors hover:text-teal-300"
        >
          ➔ RETURN TO DASHBOARD
        </Link>
        <h2 className="mt-2 text-lg font-bold text-white">Ironframe Docs</h2>
      </div>

      <nav className="max-h-[calc(100vh-8rem)] space-y-4 overflow-y-auto pr-2">
        <div>
          <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-slate-500">
            Master Directory
          </p>
          <Link
            href="/docs/hub"
            className={`${linkClass(isActive(currentSlug, ["hub"]))} mb-1`}
          >
            📄 Documentation Hub
          </Link>
          <Link
            href="/docs/end-users/user-guide"
            className={linkClass(isActive(currentSlug, ["end-users", "user-guide"]))}
          >
            📘 End-User Guide
          </Link>
        </div>

        <div className="border-t border-slate-900 pt-2">
          <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-cyan-400">
            🎓 Student Training Portals (Track 1)
          </p>
          {HUB_TRACK1.map((item) => (
            <a key={item.href} href={item.href} className={`${hubHtmlLinkClass} mb-1`}>
              {item.label}
            </a>
          ))}
        </div>

        <div className="border-t border-slate-900 pt-2">
          <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-violet-400">
            💼 GRC Practitioner Specifications (Track 2)
          </p>
          {HUB_TRACK2.map((item) => (
            <a key={item.href} href={item.href} className={`${hubHtmlLinkClass} mb-1`}>
              {item.label}
            </a>
          ))}
        </div>

        <div className="border-t border-slate-900 pt-2">
          <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-amber-400">
            📥 Compliance Exports
          </p>
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- API attachment + JSON manifest, not RSC pages */}
          <a href="/api/docs/download-protocol" className={`${hubHtmlLinkClass} mb-1`}>
            Download UX/Feature Test Protocol (.docx)
          </a>
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- JSON manifest endpoint */}
          <a href="/api/docs/download-protocol?manifest=1" className={hubHtmlLinkClass}>
            Query Test Manifest JSON
          </a>
        </div>

        <div className="border-t border-slate-900 pt-2">
          <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-slate-500">
            Engineering QA
          </p>
          <Link
            href="/docs/qa/manual-testing-protocol"
            className={linkClass(isActive(currentSlug, ["qa", "manual-testing-protocol"]))}
          >
            🛡️ Core System Protocol
          </Link>
        </div>

        <div className="border-t border-slate-900 pt-2">
          <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-teal-500">
            Academic Portal
          </p>
          <Link
            href="/docs/educators/high-school-training-guide"
            className={`${linkClass(isActive(currentSlug, ["educators", "high-school-training-guide"]))} mb-1`}
          >
            🎓 Educator Syllabus
          </Link>
          <Link
            href="/docs/qa/student-testing-protocol"
            className={`${linkClass(isActive(currentSlug, ["qa", "student-testing-protocol"]))} mb-1`}
          >
            🧪 Student Sandbox Lab
          </Link>
          <Link
            href="/docs/qa/complete-feature-glossary"
            className={linkClass(isActive(currentSlug, ["qa", "complete-feature-glossary"]), true)}
          >
            📖 GRC Operations Glossary
          </Link>
        </div>
      </nav>
    </aside>
  );
}
