import { unstable_noStore as noStore } from "next/cache";
import EvidenceVaultClient from "./EvidenceVaultClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "Evidence Vault | Ironframe",
  description: "Bulk evidence export, cumulative ROI, and broker gateway simulation.",
};

export default function EvidenceVaultPage() {
  noStore();
  return (
    <div className="min-h-0 overflow-y-auto bg-slate-950">
      <EvidenceVaultClient />
    </div>
  );
}
