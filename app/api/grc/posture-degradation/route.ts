import { NextResponse } from "next/server";

import { getPostureDegradationStatus } from "@/app/actions/postureDegradationActions";

export const dynamic = "force-dynamic";

/** Public degradation workflow status (no executive secrets). */
export async function GET() {
  try {
    const status = await getPostureDegradationStatus();
    return NextResponse.json(status, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to load degradation status." },
      { status: 500 },
    );
  }
}
