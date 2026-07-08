import { unstable_noStore as noStore } from "next/cache";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "Gaps Identified | Ironframe",
  description: "Internal-only pre-submission audit and proactive remediation workflow.",
};

/** Legacy deep link — control gaps now live inline on Evidence Vault. */
export default function EvidenceGapsPage() {
  noStore();
  redirect("/vault?section=gaps");
}
