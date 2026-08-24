import { NextResponse } from "next/server";

import { requirePerimeterWorkforceOperator } from "@/app/lib/auth/perimeterWorkforceAccess";
import { fetchSalesTouch2Queue } from "@/app/lib/server/salesTouch2QueueCore";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requirePerimeterWorkforceOperator();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: 403 });
  }

  const queue = await fetchSalesTouch2Queue();
  return NextResponse.json(queue);
}
