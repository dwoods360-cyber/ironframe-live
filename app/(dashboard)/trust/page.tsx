import Link from "next/link";

import { TRUST_CENTER_ARTIFACTS } from "@/app/lib/legal/procurement";

export const metadata = {
  title: "Trust & Procurement Center | Ironframe",
  description: "DPA framework, subprocessor list, and data residency artifacts for enterprise diligence.",
};

export default function TrustCenterPage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-10 text-slate-200">
      <p className="font-mono text-[10px] uppercase tracking-widest text-teal-500/80">
        Irontrust · Procurement Pack
      </p>
      <h1 className="mt-2 text-2xl font-semibold text-slate-50">Trust &amp; Compliance Center</h1>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-400">
        Authenticated diligence surfaces for security architecture reviews, vendor risk questionnaires,
        and enterprise procurement. All financial references in platform telemetry use BigInt integer
        cents — no floating-point monetary fields.
      </p>

      <ul className="mt-10 grid gap-4 sm:grid-cols-2">
        {TRUST_CENTER_ARTIFACTS.map((artifact) => (
          <li key={artifact.slug}>
            <Link
              href={artifact.href}
              className="block h-full rounded border border-slate-800 bg-slate-900/50 p-5 transition hover:border-teal-800/60 hover:bg-slate-900/80"
            >
              <h2 className="text-sm font-semibold text-teal-300">{artifact.title}</h2>
              <p className="mt-2 text-xs leading-relaxed text-slate-400">{artifact.summary}</p>
              <span className="mt-4 inline-block font-mono text-[10px] uppercase tracking-wider text-slate-500">
                View artifact →
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
