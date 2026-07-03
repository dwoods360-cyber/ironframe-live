import TrustProcurementDocument from "@/app/(dashboard)/trust/TrustProcurementDocument";
import { SUBPROCESSOR_LIST_SECTIONS } from "@/app/lib/legal/procurement";

export const metadata = {
  title: "Subprocessor List | Ironframe Trust Center",
  description: "Corporate subprocessor disclosure for enterprise procurement.",
};

export default function TrustSubprocessorsPage() {
  return (
    <TrustProcurementDocument
      title="Corporate Subprocessor List"
      subtitle="Third-party infrastructure and service providers that may process Customer data under the Ironframe platform."
      sections={SUBPROCESSOR_LIST_SECTIONS}
      artifactLabel="subprocessor-list"
    />
  );
}
