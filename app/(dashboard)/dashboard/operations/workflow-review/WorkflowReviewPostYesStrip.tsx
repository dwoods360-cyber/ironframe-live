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
 * Post-yes close strip — plain steps for new operators.
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
        After they say yes
      </p>
      <ol className="mt-2 list-decimal space-y-1.5 pl-4 text-xs leading-relaxed text-slate-300">
        <li>
          Open the order form. Suggest from the call if helpful — they still own the 2–3 success
          goals.
        </li>
        <li>
          When ready, they type the lock word{" "}
          <code className="text-cyan-300">AGREED</code> to freeze the form.
        </li>
        <li>
          Hand off tenant setup to a platform admin (not you inventing access). They get a{" "}
          {CUSTOMER_FACING_PATH_B_SKU} activation link for <em>their</em> tenant — never send generic{" "}
          <code className="text-cyan-300">/pricing</code>.
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
          title="Admin-only: provision their tenant after the order form is locked"
        >
          Hand off to admin setup
        </Link>
      </div>
    </div>
  );
}
