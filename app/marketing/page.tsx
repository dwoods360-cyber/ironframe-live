import type { Metadata } from "next";

import MarketingHomepage from "@/app/components/marketing/MarketingHomepage";
import { listPublishedBriefingCards } from "@/app/lib/governanceFrame/publishedBriefingLedgerCards";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Ironframe | Control-first GRC for regulated operators",
  description:
    "Control-first GRC for regulated operators: database-tier multi-tenancy, Irongate API shielding, BigInt-cent exposure, and a paid Path B design-partner on-ramp — guided demo with labeled sandbox data.",
};

/** Public marketing landing — always renders the guest homepage (even when signed in). */
export default function MarketingPage() {
  /** Keep GF quiet on the product marketing page — two cards max, below the fold. */
  const publishedBriefingCards = listPublishedBriefingCards(2);
  return <MarketingHomepage publishedBriefingCards={publishedBriefingCards} />;
}
