import type { Metadata } from "next";

import MarketingHomepage from "@/app/components/marketing/MarketingHomepage";
import { listPublishedBriefingCards } from "@/app/lib/governanceFrame/publishedBriefingLedgerCards";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Ironframe | Control-first GRC for regulated operators",
  description:
    "Replace spreadsheet risk-and-evidence work with an auditable, multi-entity GRC workflow — quantified exposure, linked controls, evidence review, and board-ready output.",
};

/** Public marketing landing — always renders the guest homepage (even when signed in). */
export default function MarketingPage() {
  const publishedBriefingCards = listPublishedBriefingCards(4);
  return <MarketingHomepage publishedBriefingCards={publishedBriefingCards} />;
}
