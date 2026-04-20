import Link from "next/link";

/**
 * GRC directive: simulation / shadow-plane operational tooling is not hosted here.
 * Chaos drills (1–5) and Control Room live on the main dashboard; clearance workflows use Integrity Hub.
 */
export default function OpSupportPage() {
  return (
    <div className="flex min-h-full flex-col bg-[#050508] px-4 py-8 text-slate-200">
      <div className="mx-auto max-w-2xl rounded-lg border border-zinc-800 bg-zinc-950/80 p-6 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]">
        <h1 className="font-mono text-xs font-black uppercase tracking-widest text-zinc-300">
          Operational support
        </h1>
        <p className="mt-3 font-mono text-[11px] leading-relaxed text-zinc-500">
          Per GRC constitution, simulation injectors, diagnostic queues, and shadow-plane audit tabs are not
          exposed on this route. Use the dashboard Control Room for supervised chaos telemetry (shadow plane),
          and Integrity Hub for production clearance and audit trail.
        </p>
        <ul className="mt-4 list-inside list-disc space-y-2 font-mono text-[10px] text-zinc-400">
          <li>
            <Link href="/" className="text-cyan-400 underline-offset-2 hover:text-cyan-300 hover:underline">
              Dashboard — Control Room &amp; Kanban
            </Link>
          </li>
          <li>
            <Link
              href="/integrity"
              className="text-cyan-400 underline-offset-2 hover:text-cyan-300 hover:underline"
            >
              Integrity Hub — audit trail
            </Link>
          </li>
          <li>
            <Link
              href="/admin/clearance"
              className="text-cyan-400 underline-offset-2 hover:text-cyan-300 hover:underline"
            >
              DMZ clearance
            </Link>
          </li>
        </ul>
      </div>
    </div>
  );
}
