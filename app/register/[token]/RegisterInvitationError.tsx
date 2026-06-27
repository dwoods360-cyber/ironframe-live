import Link from "next/link";

type RegisterInvitationErrorAction = {
  href: string;
  label: string;
};

type RegisterInvitationErrorProps = {
  title: string;
  detail: string;
  statusLabel?: string;
  primaryAction?: RegisterInvitationErrorAction;
};

export default function RegisterInvitationError({
  title,
  detail,
  statusLabel = "Invitation invalid",
  primaryAction,
}: RegisterInvitationErrorProps) {
  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-lg flex-col items-center justify-center bg-[#020617] px-6 py-16 text-slate-100">
      <div className="w-full rounded-xl border border-amber-700/50 bg-slate-950/90 p-8">
        <p className="font-mono text-xs uppercase tracking-widest text-amber-400">{statusLabel}</p>
        <h1 className="mt-2 text-xl font-semibold text-white">{title}</h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-400">{detail}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          {primaryAction ? (
            <Link
              href={primaryAction.href}
              className="rounded-md border border-emerald-700/60 bg-emerald-950/40 px-4 py-2 text-sm text-emerald-100"
            >
              {primaryAction.label}
            </Link>
          ) : null}
          <Link
            href="/login"
            className="rounded-md border border-cyan-700/60 bg-cyan-950/40 px-4 py-2 text-sm text-cyan-100"
          >
            Sign in
          </Link>
          <Link
            href="/"
            className="rounded-md border border-slate-600 px-4 py-2 text-sm text-slate-200"
          >
            Home
          </Link>
        </div>
      </div>
    </main>
  );
}
