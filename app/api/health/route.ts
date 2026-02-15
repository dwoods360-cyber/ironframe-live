import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "agent-manager",
    status: "HEALTHY",
    checkedAt: new Date().toISOString(),
  });
}
