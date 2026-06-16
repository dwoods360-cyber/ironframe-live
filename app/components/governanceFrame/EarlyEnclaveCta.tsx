import Link from "next/link";

import { SALES_CONTACT_PATH } from "@/config/registration";

export default function EarlyEnclaveCta() {
  return (
    <aside className="mt-16 rounded-xl border border-slate-700 bg-gradient-to-b from-slate-900 to-slate-950 p-8 shadow-2xl shadow-black/40">
      <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-slate-500">
        Invite-only provisioning
      </p>
      <h2 className="mt-3 text-xl font-semibold tracking-tight text-slate-100">
        Secure your isolated tenant enclave
      </h2>
      <p className="mt-3 max-w-prose text-sm leading-relaxed text-slate-400">
        Ironframe provisions multi-tenant GRC workspaces through a vetted sales-assisted pathway.
        Request early access to coordinate your Command Tier evaluation and operator invitation.
      </p>
      <Link
        href={SALES_CONTACT_PATH}
        className="mt-6 inline-flex items-center justify-center rounded-md border border-slate-500 bg-slate-100 px-6 py-3 font-mono text-sm font-bold tracking-wide text-slate-950 transition hover:bg-white"
      >
        [ Request Early Enclave Access ]
      </Link>
    </aside>
  );
}
