import TrustProcurementDocument from "@/app/(dashboard)/trust/TrustProcurementDocument";
import { DATA_RESIDENCY_SECTIONS } from "@/app/lib/legal/procurement";

export const metadata = {
  title: "Data Residency | Ironframe Trust Center",
  description: "Single-region data residency and infrastructure sovereignty statement.",
};

export default function TrustDataResidencyPage() {
  return (
    <TrustProcurementDocument
      title="Single-Region Data Residency & Infrastructure Sovereignty Statement"
      subtitle="v0.1.0-ga-epic17 operational limits — single Supabase region anchor without speculative multi-region routing."
      sections={DATA_RESIDENCY_SECTIONS}
      artifactLabel="data-residency-sovereignty"
    />
  );
}
