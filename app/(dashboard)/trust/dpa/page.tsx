import TrustProcurementDocument from "@/app/(dashboard)/trust/TrustProcurementDocument";
import { DPA_FRAMEWORK_SECTIONS } from "@/app/lib/legal/procurement";

export const metadata = {
  title: "DPA Framework | Ironframe Trust Center",
  description: "Data Processing Addendum framework for design-partner diligence.",
};

export default function TrustDpaPage() {
  return (
    <TrustProcurementDocument
      title="Data Processing Addendum (DPA) Framework"
      subtitle="Processor obligations, technical measures, and cooperation terms for Ironframe GRC Command Tier workspaces."
      sections={DPA_FRAMEWORK_SECTIONS}
      artifactLabel="dpa-framework"
    />
  );
}
