import { NextResponse } from "next/server";

import {
  getSharedBoardContext,
  serializeBoardContextPayload,
} from "@/app/lib/board/sharedBoardContext";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const payload = await getSharedBoardContext();
    return new NextResponse(serializeBoardContextPayload(payload), {
      status: 200,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Board context aggregation failed.";
    const status = message.startsWith("UNAUTHORIZED_ACCESS") ? 401 : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
