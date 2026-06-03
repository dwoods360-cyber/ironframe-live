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
            href="/docs/qa/feature-glossary"
            className={linkClass(isActive(currentSlug, ["qa", "feature-glossary"]), true)}
          >
            📖 Feature Glossary
          </Link>
        </div>
      </nav>
    </aside>
  );
}
