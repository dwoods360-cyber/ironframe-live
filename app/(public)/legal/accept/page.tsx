import { Suspense } from "react";

import LegalAcceptClient from "./LegalAcceptClient";

export const metadata = {
  title: "Legal acceptance · Ironframe",
};

export default function LegalAcceptPage() {
  return (
    <Suspense fallback={<main className="p-12 text-sm text-[var(--login-muted)]">Loading…</main>}>
      <LegalAcceptClient />
    </Suspense>
  );
}
