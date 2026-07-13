import Link from "next/link";

type Props = {
  tenantSlug: string;
  status: string;
  checkoutUrl?: string | null;
};

export default function BillingSuspensionNotice({
  tenantSlug,
  status,
  checkoutUrl = null,
}: Props) {
  return (
    <main className="flex min-h-[70vh] flex-col items-center justify-center bg-[#050509] px-6 py-16 text-slate-200">
      <div className="w-full max-w-lg rounded-xl border border-amber-500/30 bg-slate-900/80 p-8 shadow-2xl shadow-black/40">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-amber-400/90">
          Account billing hold
        </p>
        <h1 className="mt-3 text-xl font-semibold text-slate-50">Workspace access paused</h1>
        <p className="mt-4 text-sm leading-relaxed text-slate-400">
          The <span className="font-mono text-amber-200/90">{tenantSlug}</span> enclave is in{" "}
          <span className="font-mono text-slate-200">{status}</span> billing status. Live GRC
          command surfaces remain sealed until your design-partner subscription is confirmed by
          Ironframe sales operations.
        </p>
        <p className="mt-4 text-sm leading-relaxed text-slate-500">
          If you have already remitted payment via invoice or payment link, contact your sales
          engineer — an operator will activate your tenant within one business day.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          {checkoutUrl ? (
            <a
              href={checkoutUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md border border-emerald-500/50 bg-emerald-950/30 px-4 py-2.5 text-center font-mono text-xs font-bold uppercase tracking-wide text-emerald-100 transition hover:bg-emerald-950/50"
            >
              Complete subscription — Stripe Checkout
            </a>
          ) : null}
          <Link
            href="/register/contact"
            className="rounded-md border border-amber-500/50 bg-amber-950/30 px-4 py-2.5 text-center font-mono text-xs font-bold uppercase tracking-wide text-amber-100 transition hover:bg-amber-950/50"
          >
            Contact sales
          </Link>
          <Link
            href="/login"
            className="rounded-md border border-slate-700 px-4 py-2.5 text-center font-mono text-xs text-slate-300 transition hover:border-slate-500"
          >
            Switch account
          </Link>
        </div>
      </div>
    </main>
  );
}
