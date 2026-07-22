"use client";

import Link from "next/link";

export const WORKFLOW_REVIEW_ORDER_FORM_HREF = "/dashboard/operations/library/order-form";
export const WORKFLOW_REVIEW_PROVISION_HREF = "/admin/onboarding";

type WorkflowReviewPostYesStripProps = {
  /** Stronger chrome when shown under call recap after End LIVE. */
  emphasis?: "default" | "recap";
};

/**
 * Post-yes Path B close strip — order form then provision. Not a raw docs/*.md path.
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
        After a yes
      </p>
      <p className="mt-1 text-xs text-slate-300">
        Order form (2–3 criteria) → client-owned email provision → tenant Path B link — never{" "}
        <code className="text-cyan-300">/pricing</code>.
      </p>
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
        >
          Provision Path B
        </Link>
      </div>
    </div>
  );
}
