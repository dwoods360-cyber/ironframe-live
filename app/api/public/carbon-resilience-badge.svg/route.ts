import { NextResponse } from "next/server";
import { readTransparencyPublicBundleSync } from "@/app/lib/transparencyPublicDispatch";
import { generateCarbonResilienceBadgeSvg } from "@/src/services/ironscribe/publicFormatter";

export const dynamic = "force-dynamic";

/**
 * Investor-ready SVG — headline fixed per directive; links to verified PDF from latest transparency bundle.
 */
export async function GET() {
  const bundle = readTransparencyPublicBundleSync();
  if (!bundle) {
    const placeholder = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="400" height="76" viewBox="0 0 400 76" role="img">
  <rect x="1" y="1" width="398" height="74" rx="12" fill="#1e293b" stroke="#64748b" stroke-width="2"/>
  <text x="18" y="44" fill="#94a3b8" font-family="system-ui,sans-serif" font-size="12">Carbon resilience badge — awaiting public bundle</text>
</svg>`;
    return new NextResponse(placeholder, {
      status: 200,
      headers: { "Content-Type": "image/svg+xml; charset=utf-8", "Cache-Control": "public, max-age=60" },
    });
  }

  const maturityNum = Number.parseFloat(bundle.disclosure.maturityScoreDisplay);
  const svg = generateCarbonResilienceBadgeSvg({
    maturityScore: Number.isFinite(maturityNum) ? maturityNum : 7,
    href: bundle.pdfDownloadUrl,
  });

  return new NextResponse(svg, {
    status: 200,
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=300, stale-while-revalidate=60",
    },
  });
}
