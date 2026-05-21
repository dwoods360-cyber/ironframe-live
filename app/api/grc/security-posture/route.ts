import { NextResponse } from "next/server";

import { getEmergencySealPublicDescriptor } from "@/app/lib/emergencySeal";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const descriptor = await getEmergencySealPublicDescriptor();
    return NextResponse.json(descriptor, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to load security posture." },
      { status: 500 },
    );
  }
}
