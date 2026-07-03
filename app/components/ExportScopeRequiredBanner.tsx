"use client";

import { useSearchParams } from "next/navigation";

import AnalystExportsLink from "@/app/components/nav/AnalystExportsLink";
import { useHostTenantSlug } from "@/app/hooks/useHostTenantSlug";

/** Banner when analyst exports redirect with `?exportScope=required` (Command Post or Get Started). */
export default function ExportScopeRequiredBanner() {
  const searchParams = useSearchParams();
  const hostSlug = useHostTenantSlug();

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
        {hostSlug ? (
          <>
            Save your workspace ALE baseline in Get Started, then open{" "}
            <AnalystExportsLink className="text-cyan-300 underline-offset-2 hover:underline">
              Analyst exports
            </AnalystExportsLink>{" "}
            again.
          </>
        ) : (
          <>
            Select your workspace tenant in the header switcher, complete Get Started (ALE baseline),
            then open{" "}
            <AnalystExportsLink className="text-cyan-300 underline-offset-2 hover:underline">
              Analyst exports
            </AnalystExportsLink>{" "}
            again.
          </>
        )}
      </p>
    </div>
  );
}
