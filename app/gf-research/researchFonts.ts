import { Source_Sans_3, Source_Serif_4 } from "next/font/google";

/** UI + body — institutional research surfaces (not product SaaS stacks). */
export const gfSans = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-gf-sans",
  display: "swap",
});

/** Display + paper titles — research institute, not campus journal. */
export const gfSerif = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-gf-serif",
  display: "swap",
});
