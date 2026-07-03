import Link from "next/link";

type Props = {
  message: string;
};

/** Shown when analyst exports require an active workspace tenant scope. */
export default function ExportScopeRequiredPanel({ message }: Props) {
  return (
    <div className="min-h-[min(100dvh,48rem)] bg-slate-950 px-4 py-8 text-slate-100 md:px-8">
      <div className="mx-auto w-full max-w-2xl rounded-xl border border-amber-500/30 bg-amber-950/10 p-6 sm:p-8">
        <p className="font-mono text-[10px] uppercase tracking-widest text-amber-400">
          Workspace scope required
        </p>
        <h1 className="mt-2 text-xl font-semibold text-white">Analyst exports need a tenant context</h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-300">{message}</p>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-slate-400">
          <li>
            On a tenant subdomain (for example <code className="text-cyan-300">acme.lvh.me</code>), sign in
            to that workspace host.
          </li>
          <li>
            On the apex Command Post, use the tenant switcher in the header to bind{" "}
            <code className="text-cyan-300">ironframe-tenant</code> before opening exports.
          </li>
        </ul>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/"
            className="inline-flex h-11 items-center rounded-lg border border-cyan-500/40 bg-cyan-950/30 px-4 font-mono text-[10px] font-bold tracking-wide text-cyan-200 uppercase transition hover:bg-cyan-950/50"
          >
            Command Post
          </Link>
          <Link
            href="/get-started"
            className="inline-flex h-11 items-center rounded-lg border border-slate-700 px-4 font-mono text-[10px] text-slate-300 uppercase transition hover:border-slate-500 hover:text-white"
          >
            Get Started
          </Link>
          <Link
            href="/dashboard/exports"
            className="inline-flex h-11 items-center rounded-lg border border-slate-700 px-4 font-mono text-[10px] text-slate-300 uppercase transition hover:border-slate-500 hover:text-white"
          >
            Retry exports
          </Link>
        </div>
      </div>
    </div>
  );
}
