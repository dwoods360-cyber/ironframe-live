"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import BankVaultSupervisorGate from "@/app/components/BankVaultSupervisorGate";

export type ClearanceThreatRow = {
  id: string;
  tenantId: string;
  title: string;
  status: string;
};

type AdminClearanceClientProps = {
  initialThreats: ClearanceThreatRow[];
  tenantId: string;
  operatorId: string;
};

function isVaultEligible(status: string): boolean {
  const u = status.toUpperCase();
  return u !== "RESOLVED" && u !== "CLOSED_ARCHIVED";
}

/**
 * Epic 11.4 — Administrative threat clearance control room with dual-gate supervisor UI.
 */
export default function AdminClearanceClient({
  initialThreats,
  tenantId,
  operatorId,
}: AdminClearanceClientProps) {
  const router = useRouter();
  const [quarantinedThreats, setQuarantinedThreats] = useState<ClearanceThreatRow[]>(initialThreats);
  const [activeThreat, setActiveThreat] = useState<ClearanceThreatRow | null>(null);

  const handleOverrideSuccess = (integrityHash: string) => {
    if (activeThreat) {
      setQuarantinedThreats((prev) =>
        prev.map((t) => (t.id === activeThreat.id ? { ...t, status: "RESOLVED" } : t)),
      );
      setActiveThreat(null);
    }
    router.refresh();
    console.info(`[VAULT CLEARANCE] Integrity cryptographic seal logged: ${integrityHash}`);
  };

  return (
    <div className="min-h-screen space-y-6 bg-black p-8 font-mono text-xs text-slate-100">
      <div className="border-b border-slate-800 pb-4">
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-200">
              Secure administrative threat clearance gateway
            </h1>
            <p className="mt-1 text-slate-500">
              Authorized operator workspace // Active sign-off session: {operatorId}
            </p>
            <p className="mt-1 text-[10px] text-slate-600">Tenant scope: {tenantId}</p>
          </div>
          <Link href="/admin/clearance" className="text-sm text-blue-400 hover:text-blue-300">
            Quarantine disposition table →
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-4 rounded-lg border border-slate-800 bg-slate-950 p-6">
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wider text-slate-400">
            System quarantine monitor rows
          </h2>

          {quarantinedThreats.length === 0 ? (
            <p className="rounded border border-dashed border-slate-800 p-6 text-center text-slate-500">
              No pipeline threats in clearance queue for this tenant.
            </p>
          ) : (
            quarantinedThreats.map((threat) => {
              const eligible = isVaultEligible(threat.status);
              return (
                <div
                  key={threat.id}
                  role="button"
                  tabIndex={eligible ? 0 : -1}
                  onClick={() => eligible && setActiveThreat(threat)}
                  onKeyDown={(e) => {
                    if (eligible && (e.key === "Enter" || e.key === " ")) {
                      e.preventDefault();
                      setActiveThreat(threat);
                    }
                  }}
                  className={`cursor-pointer rounded border p-4 transition-all ${
                    activeThreat?.id === threat.id
                      ? "border-red-700 bg-red-950/20 text-red-100"
                      : !eligible
                        ? "cursor-not-allowed border-slate-900 bg-slate-900/40 text-slate-500"
                        : "border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-700"
                  }`}
                >
                  <div className="mb-1 flex items-center justify-between">
                    <span className="font-bold text-amber-500">{threat.id}</span>
                    <span
                      className={`rounded px-2 py-0.5 text-[10px] ${
                        threat.status === "RESOLVED"
                          ? "bg-green-950 text-green-400"
                          : "bg-amber-950 text-amber-400"
                      }`}
                    >
                      {threat.status}
                    </span>
                  </div>
                  <p className="text-xs font-semibold">{threat.title}</p>
                  <p className="mt-1 text-[10px] text-slate-500">Tenant ID scope: {threat.tenantId}</p>
                </div>
              );
            })
          )}
        </div>

        <div className="space-y-4">
          {activeThreat ? (
            <BankVaultSupervisorGate
              threatId={activeThreat.id}
              tenantId={activeThreat.tenantId}
              operatorId={operatorId}
              onVerificationSuccess={handleOverrideSuccess}
              onVerificationFailure={(err) => console.error(`[VAULT CRITICAL VIOLATION]: ${err}`)}
            />
          ) : (
            <div className="flex h-48 flex-col items-center justify-center rounded-lg border border-dashed border-slate-800 p-6 text-center text-slate-600">
              <p className="mb-1 font-semibold uppercase tracking-wider">Vault awaiting input</p>
              <p className="max-w-xs text-[10px]">
                Select an active quarantined item from the monitoring matrix to activate the hardware
                attestation challenge gateway.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
