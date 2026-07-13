import Link from "next/link";

type Props = {
  message: string;
};

/** Shown on `/exports` when analyst export scope or ALE baseline is not ready. */
export default function ExportScopeRequiredPanel({ message }: Props) {
  return (
    <div className="flex w-full flex-1 flex-col px-4 py-6 text-slate-100 md:px-8" data-testid="analyst-exports-scope-gate">
      <div className="mx-auto w-full max-w-2xl rounded-xl border border-amber-500/30 bg-amber-950/10 p-6 sm:p-8">
        <p className="font-mono text-[10px] uppercase tracking-widest text-amber-400">
          Analyst export scope
        </p>
        <h1 className="mt-2 text-xl font-semibold text-white">Complete workspace setup before exporting</h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-300">{message}</p>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-slate-400">
          <li>
            On a tenant subdomain (for example <code className="text-cyan-300">acorp.lvh.me</code>), stay on
            that workspace host while you configure exports.
          </li>
          <li>
            Save your workspace ALE baseline in Get Started, then return to this console.
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
            href="/get-started#workspace-ale-baseline"
            className="inline-flex h-11 items-center rounded-lg border border-amber-500/40 bg-amber-950/30 px-4 font-mono text-[10px] font-bold tracking-wide text-amber-100 uppercase transition hover:bg-amber-950/50"
          >
            Configure ALE baseline
          </Link>
        </div>
      </div>
    </div>
  );
}
