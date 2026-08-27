import Link from "next/link";

export default function FellowsNav() {
  return (
    <nav
      className="sticky top-0 z-20 flex h-12 w-full items-center justify-between border-b border-slate-800 bg-slate-950/95 px-4 backdrop-blur sm:px-6"
      aria-label="IRONFRAMEGRC / IRONFRAME// FELLOWS navigation"
    >
      <Link
        href="/fellows"
        className="font-mono text-sm font-black tracking-[0.12em] text-white transition-colors hover:text-teal-300"
      >
        IRONFRAMEGRC
        <span className="ml-0.5 text-teal-400">// FELLOWS</span>
      </Link>
      <div className="flex items-center gap-3 text-sm">
        <Link
          href="/fellows#how-it-works"
          className="hidden text-slate-400 transition-colors hover:text-slate-200 sm:inline"
        >
          How it works
        </Link>
        <Link
          href="/fellows#learning"
          className="hidden text-slate-400 transition-colors hover:text-slate-200 sm:inline"
        >
          Learning
        </Link>
        <Link
          href="/fellows#capstone"
          className="hidden text-slate-400 transition-colors hover:text-slate-200 sm:inline"
        >
          Capstone
        </Link>
        <a
          href="https://research.ironframegrc.com"
          target="_blank"
          rel="noopener noreferrer"
          className="hidden text-slate-400 transition-colors hover:text-slate-200 lg:inline"
        >
          Governance Frame
        </a>
        <Link
          href="/fellows/lab"
          className="rounded-md bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-teal-500"
        >
          Enter lab
        </Link>
      </div>
    </nav>
  );
}
