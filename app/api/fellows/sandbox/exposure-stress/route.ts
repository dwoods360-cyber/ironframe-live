import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import {
  computeExposureBounds,
  floatTheaterExposureDollars,
} from "@/app/lib/fellows/exposureMath";
import { issueFellowMissionReceipt } from "@/app/lib/fellows/receipts";
import { requireActiveFellow } from "@/app/lib/fellows/requireFellow";

export const runtime = "nodejs";

const ExposureSchema = z.object({
  sleMinCents: z.number().int().min(1).max(50_000_000_00),
  sleMaxCents: z.number().int().min(1).max(50_000_000_00),
  /** ARO × 1000 (1000 = 1.0 occurrence/year). */
  aroMinMilli: z.number().int().min(1).max(50_000),
  aroMaxMilli: z.number().int().min(1).max(50_000),
});

/**
 * Mission 01 — server-proven whole-cent estimated exposure stress-test.
 * Pass requires a receipt; client cannot self-attest.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireActiveFellow(req);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = ExposureSchema.parse(await req.json());
    if (body.sleMinCents > body.sleMaxCents) {
      return NextResponse.json({ error: "SLE min must be ≤ SLE max" }, { status: 400 });
    }
    if (body.aroMinMilli > body.aroMaxMilli) {
      return NextResponse.json({ error: "ARO min must be ≤ ARO max" }, { status: 400 });
    }

    const bounds = computeExposureBounds({
      sleMinCents: BigInt(body.sleMinCents),
      sleMaxCents: BigInt(body.sleMaxCents),
      aroMinMilli: BigInt(body.aroMinMilli),
      aroMaxMilli: BigInt(body.aroMaxMilli),
    });

    const theater = floatTheaterExposureDollars(
      body.sleMinCents,
      body.sleMaxCents,
      body.aroMinMilli / 1000,
      body.aroMaxMilli / 1000,
    );

    const receipt = await issueFellowMissionReceipt({
      fellowId: auth.fellow.id,
      missionCode: "EXPOSURE",
      payload: {
        sleMinCents: body.sleMinCents,
        sleMaxCents: body.sleMaxCents,
        aroMinMilli: body.aroMinMilli,
        aroMaxMilli: body.aroMaxMilli,
        estimatedExposureMinCents: bounds.estimatedExposureMinCents.toString(),
        estimatedExposureMaxCents: bounds.estimatedExposureMaxCents.toString(),
        formula: bounds.formula,
        claimHygiene: bounds.claimHygiene,
        floatTheaterContrast: theater,
      },
    });

    return NextResponse.json({
      ok: true,
      missionCode: "EXPOSURE",
      claimHygiene: "estimated_exposure",
      result: {
        estimatedExposureMinCents: bounds.estimatedExposureMinCents.toString(),
        estimatedExposureMaxCents: bounds.estimatedExposureMaxCents.toString(),
        formula: bounds.formula,
        floatTheaterContrast: theater,
        note: "Server BIGINT cents — not float dollars. Label as estimated exposure, not true ALE.",
      },
      receiptId: receipt.receiptId,
      receiptToken: receipt.receiptToken,
      expiresAt: receipt.expiresAt.toISOString(),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid exposure inputs — whole integers only", details: error.flatten() },
        { status: 400 },
      );
    }
    console.error("[fellows/exposure-stress]", error);
    return NextResponse.json({ error: "Exposure stress-test failed" }, { status: 500 });
  }
}
