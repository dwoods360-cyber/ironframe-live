"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Clock, HardDrive } from "lucide-react";
import { reverifyLkgColdStoreAction } from "@/app/actions/integrityVaultActions";
import type { IntegrityVaultSnapshot, LkgWorkforceRow } from "@/app/types/integrityVault";
import { LKG_COLD_STORE_ROOT } from "@/app/utils/integrityVaultConstants";
import IntegrityEvidenceLedger from "@/app/components/integrity/IntegrityEvidenceLedger";
import type { ServerIntegrityLedgerRow } from "@/app/types/integrityLedger";

function statusPill(status: LkgWorkforceRow["status"]) {
  if (status === "LKG_VERIFIED")
    return (
      <span className="rounded border border-emerald-600/50 bg-emerald-950/50 px-1.5 py-0.5 text-[8px] font-black uppercase text-emerald-300">
        LKG_VERIFIED
      </span>
    );
  if (status === "NO_MANIFEST_ENTRY")
    return (
      <span className="rounded border border-amber-700/50 bg-amber-950/40 px-1.5 py-0.5 text-[8px] font-black uppercase text-amber-200/90">
        NO_ENTRY
      </span>
    );
  return (
    <span className="rounded border border-rose-800/60 bg-rose-950/40 px-1.5 py-0.5 text-[8px] font-black uppercase text-rose-300/90">
      VAULT_UNREACHABLE
    </span>
  );
}

type Props = {
  initialVault: IntegrityVaultSnapshot;
  ledgerRows: ServerIntegrityLedgerRow[];
  /** ALE hero — composed in `integrity/page.tsx` with server-derived `totalMitigated`. */
  aleHero: ReactNode;
};

export default function IntegrityHubClient({ initialVault, ledgerRows, aleHero }: Props) {
  const router = useRouter();
  const [vault, setVault] = useState<IntegrityVaultSnapshot>(initialVault);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const id = window.setInterval(() => {
      if (!isPending) {
        startTransition(() => {
          router.refresh();
        });
      }
    }, 5000);
    return () => window.clearInterval(id);
  }, [isPending, router]);

  const onReverify = () => {
    startTransition(() => {
      void reverifyLkgColdStoreAction().then(setVault);
    });
  };

  const verifiedCount = vault.agents.filter((a) => a.status === "LKG_VERIFIED").length;
  const agentTotal = vault.agents.length;
  const verifyPct = agentTotal > 0 ? Math.round((verifiedCount / agentTotal) * 100) : 0;

  const lastReadDisplay = useMemo(() => {
    const raw = vault.verifiedAt?.trim();
    if (!raw) return "—";
    const t = Date.parse(raw);
    if (Number.isFinite(t)) {
      const d = new Date(t);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
    }
    return raw;
  }, [vault.verifiedAt]);

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex flex-col">
        <div className="mb-3 flex flex-wrap items-start justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="min-w-0 max-w-3xl flex-1">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-teal-500/90">Integrity hub</p>
            <h1 className="mt-0.5 text-xl font-bold tracking-tight text-white">Audit ledger &amp; cold-store attestation</h1>
          </div>
          <Link
            href="/"
            className="shrink-0 rounded-md border border-slate-600 bg-slate-900 px-4 py-2 text-[10px] font-bold uppercase tracking-wide text-slate-200 hover:border-teal-600/50 hover:text-teal-200"
          >
            ← Main ops
          </Link>
        </div>

        {aleHero}

        <p className="text-xs text-slate-400">
          Forensic evidence from chaos operations, LKG manifest visibility on{" "}
          <span className="font-mono text-slate-300">{LKG_COLD_STORE_ROOT}</span>, and workforce verification state.
        </p>
      </div>

      <IntegrityEvidenceLedger serverRows={ledgerRows} liveSyncActive />

      <section
        className="overflow-hidden rounded-lg border border-slate-800 bg-slate-950/80 shadow-inner"
        aria-labelledby="workforce-inventory-heading"
      >
          <h2 id="infrastructure-proof-sr" className="sr-only">
            Infrastructure proof — vault handshake and workforce inventory
          </h2>

          <div className="flex flex-row flex-wrap items-center justify-between gap-6 border-b border-slate-800/90 bg-slate-900/50 px-4 py-2 md:px-6">
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-6">
              <HardDrive
                className="h-5 w-5 shrink-0 text-teal-500/90"
                aria-hidden
                strokeWidth={2}
              />
              <div className="min-w-0 max-w-[min(100%,28rem)]">
                <p className="text-[8px] font-black uppercase tracking-widest text-slate-600">Manifest path</p>
                <p
                  className="truncate font-mono text-[9px] text-slate-500"
                  title={vault.manifestPath}
                >
                  {vault.manifestPath}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2 border-l border-slate-800/80 pl-6">
                <Clock className="h-4 w-4 shrink-0 text-slate-600" aria-hidden strokeWidth={2} />
                <div>
                  <p className="text-[8px] font-black uppercase tracking-widest text-slate-600">Last read</p>
                  <p className="whitespace-nowrap font-mono text-[10px] text-slate-400">{lastReadDisplay}</p>
                </div>
              </div>
              <div className="flex shrink-0 flex-col gap-1 border-l border-slate-800/80 pl-6">
                <p className="text-[8px] font-black uppercase tracking-widest text-slate-600">Status</p>
                {vault.ok ? (
                  <span className="rounded-md border border-emerald-500/90 bg-emerald-950/80 px-2.5 py-1 text-[9px] font-black uppercase tracking-wide text-emerald-200 shadow-[0_0_14px_rgba(52,211,153,0.22)]">
                    Manifest reachable
                  </span>
                ) : (
                  <span className="rounded-md border border-rose-600/80 bg-rose-950/70 px-2.5 py-1 text-[9px] font-black uppercase tracking-wide text-rose-200">
                    {vault.error ?? "Unreachable"}
                  </span>
                )}
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-3 border-l border-slate-800/80 pl-6">
                <div>
                  <p className="text-[8px] font-black uppercase tracking-widest text-slate-600">Verification</p>
                  <p className="text-[10px] font-semibold tabular-nums text-slate-300">
                    Agents verified: {verifiedCount} / {agentTotal}
                  </p>
                </div>
                <div
                  className="flex items-center gap-2"
                  role="progressbar"
                  aria-valuenow={verifyPct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`LKG agents verified ${verifyPct} percent`}
                >
                  <div className="h-2 w-20 overflow-hidden rounded-full bg-slate-800 ring-1 ring-slate-700/80">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-700 to-emerald-400 transition-[width] duration-300"
                      style={{ width: `${verifyPct}%` }}
                    />
                  </div>
                  <span className="font-mono text-[9px] text-slate-500">{verifyPct}%</span>
                </div>
              </div>
            </div>
            <button
              type="button"
              disabled={isPending}
              onClick={onReverify}
              className="shrink-0 rounded-md border border-teal-600/70 bg-teal-950/50 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-teal-100 transition-colors hover:border-teal-400 hover:bg-teal-900/40 disabled:opacity-50"
            >
              {isPending ? "Re-verifying…" : "Re-verify vault"}
            </button>
          </div>

          <div className="p-4 pt-3 md:px-5">
            <h2
              id="workforce-inventory-heading"
              className="text-xs font-black uppercase tracking-[0.15em] text-slate-200"
            >
              Workforce inventory
            </h2>
            <p className="mt-1 text-[10px] text-slate-500">
              19-agent LKG roster — checkpoint{" "}
              <span className="font-mono text-slate-400">{LKG_COLD_STORE_ROOT}</span>
            </p>

            <div className="mt-3 w-full min-w-0">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {vault.agents.map((agent) => (
                  <div
                    key={agent.name}
                    className="flex flex-col gap-1.5 rounded border border-slate-800/90 bg-slate-900/50 px-2.5 py-2"
                  >
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold leading-tight text-white">{agent.name}</span>
                      {statusPill(agent.status)}
                    </div>
                    <p className="text-[7px] uppercase tracking-wide text-slate-600">SHA256 (manifest)</p>
                    {agent.sha256 ? (
                      <p className="break-all font-mono text-[8px] leading-snug text-slate-400">{agent.sha256}</p>
                    ) : (
                      <p className="font-mono text-[8px] text-slate-600">—</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
      </section>
    </div>
  );
}
