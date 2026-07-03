"use client";

import { Suspense } from "react";

import ExportScopeRequiredBanner from "@/app/components/ExportScopeRequiredBanner";

/** Suspense boundary required for `useSearchParams` in the export-scope banner. */
export default function ExportScopeRequiredBannerSlot() {
  return (
    <Suspense fallback={null}>
      <ExportScopeRequiredBanner />
    </Suspense>
  );
}
