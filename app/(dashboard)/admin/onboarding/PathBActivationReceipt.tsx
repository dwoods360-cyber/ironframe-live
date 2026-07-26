"use client";

import { useState } from "react";

import { isCounselPathBSendApproved } from "@/config/commercialGates";
import { copyTextToClipboard } from "@/app/utils/safeClipboard";

type PathBActivationReceiptProps = {
  slug: string;
  activationCheckoutUrl: string | null | undefined;
  /** Prefer client-owned operator email when known from the provision form. */
  operatorEmailHint?: string | null;
};

/**
 * Post-provision send checklist — prevents /pricing handoffs.
 * Counsel D0 must be approved (IRONFRAME_COUNSEL_D0_APPROVED) before copy/send.
 */
export default function PathBActivationReceipt({
  slug,
  activationCheckoutUrl,
  operatorEmailHint,
}: PathBActivationReceiptProps) {
  const counselApproved = isCounselPathBSendApproved();
  const [ackCounsel, setAckCounsel] = useState(false);
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "failed">("idle");
  const canSend = counselApproved && ackCounsel;

  const copyLink = async () => {
    if (!activationCheckoutUrl || !canSend) return;
    setCopyStatus("idle");
    const ok = await copyTextToClipboard(activationCheckoutUrl);
    setCopyStatus(ok ? "copied" : "failed");
    if (ok) window.setTimeout(() => setCopyStatus("idle"), 2500);
  };

  return (
    <div className="mt-3 space-y-2 rounded border border-emerald-700/40 bg-emerald-950/25 p-3 text-[10px] text-emerald-50">
      <p className="font-mono text-[9px] font-bold uppercase tracking-widest text-emerald-300">
        Send checklist · Path B activation
      </p>

      {!counselApproved ? (
        <p className="rounded border border-amber-700/50 bg-amber-950/40 px-2 py-1.5 text-amber-100" role="alert">
          Counsel gate D0 is closed. Set{" "}
          <code className="text-amber-50">IRONFRAME_COUNSEL_D0_APPROVED=true</code> in the
          environment after counsel marks order form + MSA/DPA approved — then refresh. Do not
          send Path B signature links until then.
        </p>
      ) : (
        <label className="flex items-start gap-2 rounded border border-emerald-800/50 bg-black/20 px-2 py-1.5 text-slate-200">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={ackCounsel}
            onChange={(e) => setAckCounsel(e.target.checked)}
          />
          <span>
            I confirm counsel D0 is approved and this link goes only to the client-owned operator
            email (not @ironframegrc.com).
          </span>
        </label>
      )}

      <ol className="list-decimal space-y-1.5 pl-4 leading-relaxed text-slate-300">
        <li>
          Copy the tenant-scoped Path B link below (never{" "}
          <code className="text-cyan-300">/pricing</code>).
        </li>
        <li>
          Send it only to the <strong className="text-slate-100">client-owned</strong> operator
          email
          {operatorEmailHint ? (
            <>
              {" "}
              (<code className="text-cyan-200">{operatorEmailHint}</code>)
            </>
          ) : (
            " (e.g. ciso@customer.com — not @ironframegrc.com)"
          )}
          .
        </li>
        <li>
          After Stripe ACTIVE, partner continues at{" "}
          <code className="text-cyan-300">/{slug}/get-started</code> (or workspace{" "}
          <code className="text-cyan-300">/get-started</code>).
        </li>
      </ol>

      {activationCheckoutUrl ? (
        <div className="space-y-2 pt-1">
          <p className="font-mono text-[9px] uppercase tracking-wide text-slate-500">
            Path B activation link · <code className="text-slate-300">tenant_slug={slug}</code>
          </p>
          <code
            className={`block break-all rounded bg-black/40 px-2 py-1.5 font-mono text-[9px] ${
              canSend ? "text-emerald-200" : "text-slate-500 blur-[2px] select-none"
            }`}
          >
            {canSend ? activationCheckoutUrl : "•••••••• (unlock after counsel D0 + acknowledgment)"}
          </code>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={!canSend}
              onClick={() => void copyLink()}
              className="rounded border border-emerald-600/70 bg-emerald-900/40 px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-wide text-emerald-100 hover:bg-emerald-900/70 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {copyStatus === "copied" ? "Copied" : "Copy Path B link"}
            </button>
            {canSend ? (
              <a
                href={activationCheckoutUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center rounded border border-slate-600 px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-wide text-slate-200 hover:bg-slate-900"
              >
                Open checkout →
              </a>
            ) : null}
          </div>
          {copyStatus === "failed" ? (
            <p className="text-rose-300">Clipboard blocked — select the link and copy manually.</p>
          ) : null}
        </div>
      ) : (
        <p className="text-amber-200" role="alert">
          Stripe activation link not minted — configure STRIPE_SECRET_KEY and run{" "}
          <code className="text-amber-100">npm run stripe:provision-catalog</code>.
        </p>
      )}
    </div>
  );
}
