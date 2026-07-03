"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

/** Home-route banner when exports redirect legacy query `?exportScope=required` is present. */
export default function ExportScopeRequiredBanner() {
  const searchParams = useSearchParams();
  if (searchParams.get("exportScope") !== "required") {
    return null;
  }

  return (
    <div
      className="border-b border-amber-500/30 bg-amber-950/20 px-4 py-3 sm:px-6"
      role="status"
      aria-live="polite"
    >
      <p className="font-mono text-[10px] uppercase tracking-widest text-amber-400">
        Analyst export scope
      </p>
      <p className="mt-1 text-sm text-amber-100/90">
        Select your workspace tenant in the header switcher, then open{" "}
        <Link href="/dashboard/exports" className="text-cyan-300 underline-offset-2 hover:underline">
          Analyst exports
        </Link>{" "}
        again.
      </p>
    </div>
  );
}
