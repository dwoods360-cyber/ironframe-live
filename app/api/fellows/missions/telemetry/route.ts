import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { consumeFellowMissionReceipt } from "@/app/lib/fellows/receipts";
import { verifyFellowSessionToken } from "@/app/lib/fellows/session";
import { FELLOWS_SESSION_COOKIE } from "@/config/fellowsPortal";
import prismaFellows from "@/lib/prismaFellows";
import type { Prisma } from "@/prisma/generated/fellows-client";

export const runtime = "nodejs";

const TelemetrySchema = z.object({
  missionNumber: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  receiptToken: z.string().min(16),
});

const MISSION_CODE = {
  1: "EXPOSURE",
  2: "INGEST",
  3: "BOUNDARY",
  4: "LINEAGE",
} as const;

/**
 * Phase 1: Mission pass requires a server-issued receipt (from sandbox probe APIs).
 * Client cannot self-attest PASS.
 */
export async function POST(req: NextRequest) {
  try {
    const session = verifyFellowSessionToken(req.cookies.get(FELLOWS_SESSION_COOKIE)?.value);
    if (!session) {
      return NextResponse.json({ error: "Fellow session required" }, { status: 401 });
    }

    const body = TelemetrySchema.parse(await req.json());
    const missionCode = MISSION_CODE[body.missionNumber];

    const fellow = await prismaFellows.fellow.findUnique({ where: { id: session.fellowId } });
    if (!fellow || fellow.status !== "ACTIVE") {
      return NextResponse.json({ error: "Fellow not active" }, { status: 403 });
    }

    const consumed = await consumeFellowMissionReceipt({
      fellowId: fellow.id,
      missionCode,
      receiptToken: body.receiptToken,
    });

    if (!consumed.ok) {
      return NextResponse.json({ error: consumed.error }, { status: 422 });
    }

    const now = new Date();
    const updated = await prismaFellows.fellowMission.upsert({
      where: {
        fellowId_missionNumber: {
          fellowId: fellow.id,
          missionNumber: body.missionNumber,
        },
      },
      create: {
        fellowId: fellow.id,
        missionNumber: body.missionNumber,
        missionCode,
        status: "PASSED",
        telemetryData: consumed.payload as Prisma.InputJsonValue,
        startedAt: now,
        completedAt: now,
      },
      update: {
        status: "PASSED",
        telemetryData: consumed.payload as Prisma.InputJsonValue,
        failureReason: null,
        completedAt: now,
      },
    });

    const passedCount = await prismaFellows.fellowMission.count({
      where: { fellowId: fellow.id, status: "PASSED" },
    });

    return NextResponse.json({
      success: true,
      missionNumber: body.missionNumber,
      status: updated.status,
      progress: {
        passedCount,
        totalMissions: 4,
        rubricUnlocked: passedCount >= 4,
        nextMissionNumber:
          passedCount < 4 && body.missionNumber < 4 ? body.missionNumber + 1 : null,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid telemetry", details: error.flatten() },
        { status: 400 },
      );
    }
    console.error("[fellows/missions/telemetry]", error);
    return NextResponse.json({ error: "Telemetry failed" }, { status: 500 });
  }
}
