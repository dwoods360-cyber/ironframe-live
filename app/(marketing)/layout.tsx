import type { ReactNode } from "react";

import MarketingPresentationShell from "@/app/components/marketing/MarketingPresentationShell";

export default function MarketingRouteLayout({ children }: { children: ReactNode }) {
  return <MarketingPresentationShell>{children}</MarketingPresentationShell>;
}
