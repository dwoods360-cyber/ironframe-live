import { NextResponse } from "next/server";
import { readTransparencyPublicBundleSync } from "@/app/lib/transparencyPublicDispatch";
import { generateTruthBadgeSvg } from "@/src/services/ironscribe/publicFormatter";

export const dynamic = "force-dynamic";

/**
 * Public SVG badge — maturity + streak; links to time-bounded verified PDF URL from latest bundle.
 */
export async function GET() {
  const bundle = readTransparencyPublicBundleSync();
  if (!bundle) {
    const placeholder = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="320" height="72" viewBox="0 0 320 72" role="img" aria-label="Ironframe Truth Badge pending">
  <rect x="1" y="1" width="318" height="70" rx="10" fill="#1e293b" stroke="#64748b" stroke-width="2"/>
  <text x="16" y="32" fill="#a7f3d0" font-family="system-ui,Segoe UI,sans-serif" font-size="11" font-weight="700">IRONFRAME · TRUTH BADGE</text>
  <text x="16" y="52" fill="#94a3b8" font-family="system-ui,Segoe UI,sans-serif" font-size="12">Public disclosure bundle pending</text>
</svg>`;
    return new NextResponse(placeholder, {
      status: 200,
      headers: {
        "Content-Type": "image/svg+xml; charset=utf-8",
        "Cache-Control": "public, max-age=60",
      },
    });
  }

  const svg = generateTruthBadgeSvg({
    maturityScore: bundle.disclosure.maturityScoreDisplay,
    streakDays: bundle.disclosure.streakDaysDisplay,
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
