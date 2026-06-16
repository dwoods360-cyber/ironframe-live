import type { Metadata } from "next";
import MarketingHomepage from "@/app/components/marketing/MarketingHomepage";

export const metadata: Metadata = {
  title: "Ironframe | The Immutable Standard for AI-Driven GRC",
  description:
    "Multi-tenant GRC command post for regulated enterprises — finance, healthcare, utilities, and defense. Deterministic threat-to-board telemetry with tenant-scoped vaults.",
};

/** Public marketing landing — always renders the guest homepage (even when signed in). */
export default function MarketingPage() {
  return <MarketingHomepage />;
}
