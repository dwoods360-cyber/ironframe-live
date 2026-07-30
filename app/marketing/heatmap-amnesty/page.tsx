import type { Metadata } from "next";

import HeatmapAmnestyLanding from "@/app/components/marketing/HeatmapAmnestyLanding";

export const metadata: Metadata = {
  title: "Heatmap Amnesty | Ironframe",
  description:
    "Keep the heatmap if you must. Make estimated dollar exposure in whole cents the board decision layer. Command Design Partner workflow review — not a free pilot.",
};

/** Public Heatmap Amnesty campaign landing — Priority-1 Path B demand gen. */
export default function HeatmapAmnestyPage() {
  return <HeatmapAmnestyLanding />;
}
