"use client";

import Link from "next/link";
import { DEMO_SANDBOX_BANNER_HEIGHT_CLASS } from "@/app/components/demo/demoBannerLayout";

export function DemoEvaluationBanner({ className = "" }: { className?: string }) {
  return (
    <div
      className={`${DEMO_SANDBOX_BANNER_HEIGHT_CLASS} flex items-center justify-center border-b border-cyan-400/70 bg-gradient-to-r from-slate-950 via-cyan-950 to-slate-950 px-4 shadow-[0_2px_14px_rgba(0,0,5)] ${className}`}
      role="status"
      aria-live="polite"
    >
      <p className="text-center font-mono text-[11px] font-semibold tracking-wide text-cyan-100">
        💡 You are exploring an isolated evaluation sandbox.{" "}
        <Link
          href="/register/contact"
          className="underline decoration-cyan-400/80 underline-offset-2 transition-colors hover:text-white"
        >
          Click here to claim your permanent, secure multi-tenant GRC enclave.
        </Link>
      </p>
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
