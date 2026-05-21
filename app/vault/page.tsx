import { Suspense } from "react";
import { unstable_noStore as noStore } from "next/cache";
import EvidenceVaultClient from "@/app/(dashboard)/evidence/EvidenceVaultClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "Evidence Vault | Ironframe",
  description: "Bulk evidence export, cumulative ROI, and broker gateway simulation.",
};

/** Sidebar canonical route (`/vault`) — same shell as `(dashboard)/evidence`. */
export default function VaultEvidencePage() {
  noStore();
  return (
    <div className="min-h-0 overflow-y-auto bg-slate-950">
      <Suspense
        fallback={
          <div className="flex min-h-[40vh] items-center justify-center px-4 text-[11px] font-mono text-slate-500">
            Loading evidence vault…
          </div>
        }
      >
        <EvidenceVaultClient />
      </Suspense>
    </div>
  );
}
