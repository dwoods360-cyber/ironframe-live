"use client";

import React, { useState, useTransition } from "react";
import { verifyAndCommitVaultResolutionAction } from "@/app/actions/bankVaultActions";

export interface SupervisorGateProps {
  threatId: string;
  tenantId: string;
  operatorId: string;
  onVerificationSuccess: (integrityHash: string) => void;
  onVerificationFailure: (errorMessage: string) => void;
}

/**
 * Epic 11.4 — Dual-gate Bank Vault supervisor authorization UI.
 * Challenge string matches `buildBankVaultChallengeMessage` on the server.
 */
export default function BankVaultSupervisorGate({
  threatId,
  tenantId,
  operatorId,
  onVerificationSuccess,
  onVerificationFailure,
}: SupervisorGateProps) {
  const [isPending, startTransition] = useTransition();
  const [supervisorPublicKey, setSupervisorPublicKey] = useState("");
  const [transactionSignature, setTransactionSignature] = useState("");
  const [validationMessage, setValidationMessage] = useState<string | null>(null);

  const expectedChallengeMessage = `${threatId}:${tenantId}:${operatorId}`;

  const handleAuthorizationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationMessage(null);

    if (!supervisorPublicKey.trim() || !transactionSignature.trim()) {
      setValidationMessage("ERROR: Both fields are required for multi-gate execution.");
      return;
    }

    startTransition(async () => {
      try {
        const result = await verifyAndCommitVaultResolutionAction({
          threatId,
          tenantId,
          operatorId,
          supervisorPublicKey: supervisorPublicKey.trim(),
          transactionSignature: transactionSignature.trim(),
        });

        if (result.status === "PERMANENT_RELEASE_SEALED") {
          setValidationMessage(`VAULT UNLOCKED. Integrity tail: [${result.integrityHash}]`);
          onVerificationSuccess(result.integrityHash);
        }
      } catch (error: unknown) {
        const errorString =
          error instanceof Error ? error.message : "Cryptographic verification mismatch.";
        setValidationMessage(`PROTOCOL VIOLATION: ${errorString}`);
        onVerificationFailure(errorString);
      }
    });
  };

  return (
    <div className="max-w-xl rounded-lg border border-red-900/50 bg-slate-900 p-6 font-mono text-xs text-slate-100 shadow-xl">
      <div className="mb-4 flex items-center space-x-2 border-b border-red-950 pb-3">
        <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
        <h3 className="text-sm font-bold uppercase tracking-wider text-red-400">
          Secure Bank Vault // Dual-gate hardware handshake
        </h3>
      </div>

      <div className="mb-4 rounded border border-slate-800 bg-black/40 p-3">
        <p className="mb-1 text-slate-400">Hardware attestation challenge string</p>
        <code className="block select-all rounded bg-black/60 p-1 text-amber-400">
          {expectedChallengeMessage}
        </code>
        <p className="mt-1 text-[10px] text-slate-500">
          Instruct the secondary supervisor to sign this plaintext block via hardware token (RSA-SHA256,
          Base64).
        </p>
      </div>

      <form onSubmit={handleAuthorizationSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block uppercase tracking-tight text-slate-400">
            Supervisor public key (PEM or env ID)
          </label>
          <textarea
            value={supervisorPublicKey}
            onChange={(e) => setSupervisorPublicKey(e.target.value)}
            className="h-16 w-full resize-none rounded border border-slate-800 bg-black/60 p-2 text-slate-300 focus:border-red-500 focus:outline-none"
            placeholder="-----BEGIN PUBLIC KEY-----..."
          />
        </div>

        <div>
          <label className="mb-1 block uppercase tracking-tight text-slate-400">
            RSA-SHA256 transaction signature (Base64)
          </label>
          <input
            type="text"
            value={transactionSignature}
            onChange={(e) => setTransactionSignature(e.target.value)}
            className="w-full rounded border border-slate-800 bg-black/60 p-2 text-slate-300 focus:border-red-500 focus:outline-none"
            placeholder="hK9zXw4...=="
          />
        </div>

        <button
          type="submit"
          disabled={isPending}
          className={`w-full rounded py-2.5 text-sm font-bold uppercase transition-all ${
            isPending
              ? "cursor-not-allowed bg-slate-800 text-slate-600"
              : "border border-red-700/40 bg-red-950 text-red-400 hover:bg-red-900"
          }`}
        >
          {isPending ? "Validating cryptographic seal..." : "Commit administrative release"}
        </button>
      </form>

      {validationMessage ? (
        <div className="mt-4 rounded border border-slate-800 bg-black/40 p-3 text-center font-semibold tracking-wide text-slate-200">
          {validationMessage}
        </div>
      ) : null}
    </div>
  );
}
