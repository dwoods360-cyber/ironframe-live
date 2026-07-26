"use client";

import Link from "next/link";

import { DEMO_SANDBOX_BANNER_HEIGHT_CLASS } from "@/app/components/demo/demoBannerLayout";
import { clearDemoSession } from "@/app/lib/demo/demoMode";
import { WORKFLOW_REVIEW_CTA_MINUTES } from "@/lib/ironframeProductKnowledge/commercial";
import { SALES_CONTACT_PATH } from "@/config/registration";

export function DemoEvaluationBanner({ className = "" }: { className?: string }) {
  return (
    <div
      className={`${DEMO_SANDBOX_BANNER_HEIGHT_CLASS} flex items-center justify-center gap-3 border-b border-cyan-400/70 bg-gradient-to-r from-slate-950 via-cyan-950 to-slate-950 px-4 shadow-[0_2px_14px_rgba(0,0,5)] ${className}`}
      role="status"
      aria-live="polite"
    >
      <p className="text-center font-mono text-[11px] font-semibold tracking-wide text-cyan-100">
        Demo walkthrough — sample data only; no live workspace.{" "}
        <Link
          href={`${SALES_CONTACT_PATH}?source=demo-sandbox`}
          className="underline decoration-cyan-400/80 underline-offset-2 transition-colors hover:text-white"
        >
          Schedule a {WORKFLOW_REVIEW_CTA_MINUTES} min workflow review →
        </Link>
      </p>
      <button
        type="button"
        className="shrink-0 rounded border border-cyan-500/50 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wide text-cyan-100 hover:bg-cyan-950/60"
        onClick={() => {
          clearDemoSession();
          window.location.assign("/dashboard/admin/approvals?kind=SALES");
        }}
      >
        Exit demo
      </button>
    </div>
  );
}

export default function DemoSandboxBanner() {
  return (
    <div className="fixed inset-x-0 top-0 z-[70]">
      <DemoEvaluationBanner />
    </div>
  );
}
