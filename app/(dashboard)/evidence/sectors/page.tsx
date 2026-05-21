import { unstable_noStore as noStore } from "next/cache";
import SectorComparisonClient from "./SectorComparisonClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "Sector comparison | Evidence Vault | Ironframe",
  description: "Omni-industry risk temperature and WoW volatility versus Ironethic benchmarks.",
};

export default function EvidenceSectorsPage() {
  noStore();
  return (
    <div className="min-h-0 overflow-y-auto bg-slate-950">
      <SectorComparisonClient />
    </div>
  );
}
