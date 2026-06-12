import Link from "next/link";
import { ShieldAlert } from "lucide-react";

type AccessPendingProps = {
  email?: string | null;
  tenantUuid?: string | null;
};

/**
 * Shown when Supabase auth succeeded but no `user_role_assignments` row exists yet.
 */
export default function AccessPending({ email, tenantUuid }: AccessPendingProps) {
  return (
    <main className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-lg flex-col items-center justify-center px-6 py-16 text-slate-200">
      <div className="w-full rounded-xl border border-amber-500/30 bg-slate-950/90 p-8 shadow-lg shadow-amber-950/20">
        <div className="mb-4 flex items-center gap-3 text-amber-300">
          <ShieldAlert className="h-6 w-6 shrink-0" aria-hidden />
          <h1 className="text-xl font-semibold text-white">Access pending</h1>
        </div>
        <p className="text-sm leading-relaxed text-slate-300">
          Your account is authenticated, but workspace roles have not been provisioned yet. An
          administrator must assign tenant access in{" "}
          <span className="font-mono text-xs text-slate-400">user_role_assignments</span> before
          you can enter the command center.
        </p>
        {email ? (
          <p className="mt-4 text-xs text-slate-500">
            Signed in as <span className="font-mono text-slate-400">{email}</span>
          </p>
        ) : null}
        {tenantUuid ? (
          <p className="mt-2 text-xs text-slate-500">
            Requested tenant scope:{" "}
            <span className="font-mono text-slate-400">{tenantUuid}</span>
          </p>
        ) : null}
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/login"
            className="rounded-md border border-slate-600 px-4 py-2 text-sm text-slate-200 transition hover:border-slate-400 hover:text-white"
          >
            Sign out
          </Link>
          <Link
            href="/docs/hub"
            className="rounded-md bg-cyan-600/90 px-4 py-2 text-sm font-medium text-white transition hover:bg-cyan-500"
          >
            Read documentation
          </Link>
        </div>
      </div>
    </main>
  );
}
