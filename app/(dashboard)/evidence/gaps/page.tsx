import { unstable_noStore as noStore } from "next/cache";
import GapsHealthCheckClient from "./GapsHealthCheckClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "Gaps Identified | Ironframe",
  description: "Internal-only pre-submission audit and proactive remediation workflow.",
};

export default function EvidenceGapsPage() {
  noStore();
  return (
    <div className="min-h-0 overflow-y-auto bg-slate-950">
      <GapsHealthCheckClient />
    </div>
  );
}
