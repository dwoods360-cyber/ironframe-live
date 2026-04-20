import { NextResponse } from "next/server";
import { unstable_noStore as noStore } from "next/cache";
import { mapActiveThreatFromDbToPipelineThreat } from "@/app/utils/mapActiveThreatFromDbToPipelineThreat";
import {
  findActiveThreatEventRowsForBoard,
  mapThreatEventRowsToPipelineThreatFromDb,
} from "@/app/utils/activeThreatsBoardQuery";

export const revalidate = 0;
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function GET() {
  noStore();
  const rows = await findActiveThreatEventRowsForBoard();
  console.log("FETCHED THREATS COUNT:", rows.length);
  const fromDb = mapThreatEventRowsToPipelineThreatFromDb(rows);
  const formatted = fromDb.map(mapActiveThreatFromDbToPipelineThreat);
  return NextResponse.json(formatted, {
    headers: {
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
