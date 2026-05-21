import { Suspense } from "react";
import { unstable_noStore as noStore } from "next/cache";
import GovernanceComparisonClient from "./GovernanceComparisonClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "Governance Comparison | Ironframe",
  description: "NIST SP 800-137 and ISO 27001 cross-walk against TAS.md — Irontally.",
};

export default function GovernanceComparisonPage() {
  noStore();
  return (
    <Suspense fallback={<p className="p-8 text-sm text-slate-400">Loading comparison…</p>}>
      <GovernanceComparisonClient />
    </Suspense>
  );
}
