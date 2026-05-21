import { NextResponse } from "next/server";
import { buildGovernanceComparisonMatrix } from "@/app/services/regulatoryIngestion";

export const dynamic = "force-dynamic";

export async function GET() {
  const matrix = await buildGovernanceComparisonMatrix();
  return NextResponse.json({ ok: true, matrix }, { headers: { "Cache-Control": "no-store" } });
}
