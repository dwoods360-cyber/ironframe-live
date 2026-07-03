import Link from "next/link";

export default function RootNotFound() {
  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-lg flex-col items-center justify-center bg-[#020617] px-6 py-16 text-slate-100">
      <div className="w-full rounded-xl border border-slate-700 bg-slate-950/90 p-8 text-center">
        <p className="font-mono text-xs uppercase tracking-widest text-rose-400">404</p>
        <h1 className="mt-2 text-xl font-semibold text-white">Route not found</h1>
        <p className="mt-3 text-sm text-slate-400">
          The requested path is not registered in the Ironframe App Router.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            href="/"
            className="rounded-md border border-teal-700/60 bg-teal-950/40 px-4 py-2 text-sm font-medium text-teal-100 transition hover:border-teal-500 hover:bg-teal-900/50"
          >
            Home
          </Link>
          <Link
            href="/docs/README"
            className="rounded-md border border-slate-600 px-4 py-2 text-sm text-slate-200 transition hover:border-slate-400"
          >
            Documentation
          </Link>
        </div>
      </div>
    </main>
  );
}
