import type { ReactNode } from "react";

import MarketingPresentationShell from "@/app/components/marketing/MarketingPresentationShell";

export default function MarketingSegmentLayout({ children }: { children: ReactNode }) {
  return <MarketingPresentationShell>{children}</MarketingPresentationShell>;
}
