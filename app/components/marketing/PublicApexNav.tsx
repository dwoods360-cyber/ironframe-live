import Link from "next/link";

type PublicApexNavProps = {
  /** When true, the operator is already on the sign-in surface. */
  loginActive?: boolean;
  /** Hide the Log in affordance when a Supabase session is already present. */
  isAuthenticated?: boolean;
};

export default function PublicApexNav({
  loginActive = false,
  isAuthenticated = false,
}: PublicApexNavProps) {
  return (
    <nav
      className="sticky top-0 z-20 flex h-11 w-full items-center justify-between border-b border-slate-800 bg-slate-950 px-4 sm:px-6"
      aria-label="Ironframe global navigation"
    >
      <Link
        href="/login"
        className="font-mono text-sm font-black tracking-widest text-white transition-colors hover:text-teal-300"
      >
        IRONFRAME<span className="ml-1 text-[10px] font-bold text-teal-400">GRC</span>
      </Link>
      <div className="flex items-center gap-3">
        <Link
          href="/marketing"
          className="inline-flex h-11 items-center px-2 text-sm font-medium text-slate-400 transition-colors hover:text-slate-200"
        >
          Product overview
        </Link>
        {isAuthenticated ? (
          <Link
            href="/cockpit"
            className="inline-flex h-11 items-center rounded border border-slate-700 bg-slate-900/60 px-4 font-mono text-[10px] font-bold uppercase tracking-widest text-slate-200 transition-colors hover:border-teal-600 hover:text-white"
          >
            Command post
          </Link>
        ) : loginActive ? (
          <span
            aria-current="page"
            className="inline-flex h-11 items-center rounded border border-teal-900/50 bg-teal-950/40 px-4 font-mono text-[10px] font-bold uppercase tracking-widest text-teal-300"
          >
            Log in
          </span>
        ) : (
          <Link
            href="/login"
            className="inline-flex h-11 items-center rounded border border-teal-900/50 bg-teal-950/40 px-4 font-mono text-[10px] font-bold uppercase tracking-widest text-teal-300 transition-colors hover:bg-teal-900/40 hover:text-white"
          >
            Log in
          </Link>
        )}
      </div>
    </nav>
  );
}
