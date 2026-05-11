import { NextResponse } from "next/server";
import {
  IronbloomIngestUnprocessableError,
  validateIronbloomSustainabilityPayload,
} from "@/lib/sustainability/constants";

/**
 * Ironbloom (CSRD) intake probe — validates physical-unit discipline before any persistence path.
 * Returns 422 for currency tokens or missing kWh / L / CO2e markers.
 */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  try {
    validateIronbloomSustainabilityPayload(body);
  } catch (e) {
    if (e instanceof IronbloomIngestUnprocessableError) {
      return NextResponse.json({ error: e.message }, { status: e.httpStatus });
    }
    throw e;
  }
  return NextResponse.json({ ok: true, accepted: true }, { status: 200 });
}
