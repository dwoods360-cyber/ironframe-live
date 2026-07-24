"use client";

import Link from "next/link";

import { CUSTOMER_FACING_PATH_B_SKU } from "@/lib/ironframeProductKnowledge/commercial";

export const WORKFLOW_REVIEW_ORDER_FORM_HREF = "/dashboard/operations/library/order-form";
export const WORKFLOW_REVIEW_PROVISION_HREF = "/admin/onboarding";

type WorkflowReviewPostYesStripProps = {
  /** Stronger chrome when shown under call recap after End LIVE. */
  emphasis?: "default" | "recap";
};

/**
 * Post-call protocol after a YES — plain steps + admin handoff.
 */
export default function WorkflowReviewPostYesStrip({
  emphasis = "default",
}: WorkflowReviewPostYesStripProps) {
  const shell =
    emphasis === "recap"
      ? "rounded-lg border border-emerald-700/50 bg-emerald-950/30 p-3"
      : "rounded-lg border border-emerald-900/40 bg-emerald-950/20 p-3";

  return (
    <div id="after-yes" className={shell}>
      <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-emerald-400">
        Post-call protocol · after a YES
      </p>
      <ol className="mt-2 list-decimal space-y-2 pl-4 text-xs leading-relaxed text-slate-300">
        <li>
          <strong className="text-slate-100">Capture criteria</strong> — fill the order form with
          the exact 2–3 success criteria from the call.
        </li>
        <li>
          <strong className="text-slate-100">Lock criteria</strong> — type{" "}
          <code className="text-cyan-300">AGREED</code> in the status field to freeze the document.
        </li>
        <li>
          <strong className="text-slate-100">Admin handoff</strong> — notify platform admin to
          generate the tenant-scoped activation link (internal billing code: Path B). Do not
          provision yourself on the call.
        </li>
        <li>
          <strong className="text-slate-100">Send client link</strong> — send the client-owned
          operator their unique {CUSTOMER_FACING_PATH_B_SKU} activation URL. Never send prospects to
          generic <code className="text-cyan-300">/pricing</code>.
        </li>
      </ol>
      <div className="mt-3 flex flex-wrap gap-2">
        <Link
          href={WORKFLOW_REVIEW_ORDER_FORM_HREF}
          className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-600"
        >
          Open order form
        </Link>
        <Link
          href={WORKFLOW_REVIEW_PROVISION_HREF}
          className="rounded-lg border border-emerald-700/70 px-3 py-2 text-xs font-semibold text-emerald-100 hover:bg-emerald-950/50"
          title="Admin-only after AGREED lock — tenant activation handoff"
        >
          Hand off to admin setup
        </Link>
      </div>
    </div>
  );
}
