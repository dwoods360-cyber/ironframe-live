import type { ReactNode } from "react";
import { IBM_Plex_Sans } from "next/font/google";

import { MARKETING_HERO_VARIANT } from "./marketingHeroVariant";

/**
 * IBM Plex Sans for marketing/public surfaces when presentation variant is `v2`.
 * Geist Mono (root `--font-geist-mono`) stays for brand mark + city cycle via `font-mono`.
 * Revert: MARKETING_HERO_VARIANT = "legacy".
 */
const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-marketing-sans",
  display: "swap",
});

export default function MarketingPresentationShell({ children }: { children: ReactNode }) {
  if (MARKETING_HERO_VARIANT !== "v2") {
    return <>{children}</>;
  }

  return (
    <div className={`marketing-presentation-v2 ${ibmPlexSans.variable}`}>{children}</div>
  );
}
