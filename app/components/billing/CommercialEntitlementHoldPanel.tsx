import Link from "next/link";

type Props = {
  billingStatus?: string;
  compact?: boolean;
};

export default function CommercialEntitlementHoldPanel({
  billingStatus = "PENDING",
  compact = false,
}: Props) {
  return (
    <div
      className={
        compact
          ? "rounded-xl border border-amber-500/30 bg-amber-950/15 px-4 py-5"
          : "mx-auto max-w-xl rounded-xl border border-amber-500/30 bg-amber-950/20 p-8 shadow-2xl"
      }
    >
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-amber-400/90">
        Awaiting subscription confirmation
      </p>
      <h2
        className={
          compact ? "mt-2 text-base font-semibold text-slate-50" : "mt-3 text-xl font-semibold text-slate-50"
        }
      >
        Training corpus sealed until billing is active
      </h2>
      <p className="mt-3 text-sm leading-relaxed text-slate-400">
        Your workspace perimeter is active and isolated. Training modules, agent workforces, and
        documentation corpora unlock automatically when your design-partner subscription is confirmed
        by our delivery team.
      </p>
      {billingStatus ? (
        <p className="mt-2 font-mono text-[10px] text-slate-500">
          Billing status: <span className="text-amber-200/90">{billingStatus}</span>
        </p>
      ) : null}
      <div className={`flex flex-col gap-3 sm:flex-row ${compact ? "mt-4" : "mt-8"}`}>
        <Link
          href="/register/contact"
          className="inline-flex h-11 items-center justify-center rounded-md border border-amber-500/50 bg-amber-950/30 px-4 font-mono text-xs font-bold uppercase tracking-wide text-amber-100 transition hover:bg-amber-950/50"
        >
          Contact sales
        </Link>
        <Link
          href="/get-started"
          className="inline-flex h-11 items-center justify-center rounded-md border border-slate-700 px-4 font-mono text-xs text-slate-300 transition hover:border-slate-500"
        >
          Return to Get Started
        </Link>
      </div>
    </div>
  );
}
