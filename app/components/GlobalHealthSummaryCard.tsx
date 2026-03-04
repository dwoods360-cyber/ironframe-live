"use client";

import GlobalHealthSummaryCardClient, {
  type SerializedCompany,
} from "./GlobalHealthSummaryCardClient";

export type { SerializedCompany };

export interface GlobalHealthSummaryCardProps {
  companies: SerializedCompany[];
  coreintelTrendActive: boolean;
}

export default function GlobalHealthSummaryCard({
  companies,
  coreintelTrendActive,
}: GlobalHealthSummaryCardProps) {
  return (
    <GlobalHealthSummaryCardClient
      companies={companies}
      coreintelTrendActive={coreintelTrendActive}
    />
  );
}
