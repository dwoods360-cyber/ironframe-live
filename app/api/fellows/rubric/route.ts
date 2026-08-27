import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { requireActiveFellow } from "@/app/lib/fellows/requireFellow";
import prismaFellows from "@/lib/prismaFellows";

export const runtime = "nodejs";

const Score = z.number().int().min(1).max(5);

const RubricSchema = z.object({
  quantitativeScore: Score,
  lineageScore: Score,
  isolationScore: Score,
  velocityScore: Score,
  mathFrictionNotes: z.string().trim().min(10).max(2000),
  academicUseDescription: z.string().trim().min(10).max(2000),
  workplaceFrictionJson: z.array(z.string().trim().min(1).max(80)).max(12).default([]),
  requestBriefing: z.boolean().optional().default(false),
});

/**
 * Capstone/learning rubric — unlocked after all four missions PASS.
 * Soft Path B bridge via requestBriefing → opsCommercialLeadFlag (never shown as Path B in UI).
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireActiveFellow(req);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const passedCount = await prismaFellows.fellowMission.count({
      where: { fellowId: auth.fellow.id, status: "PASSED" },
    });
    if (passedCount < 4) {
      return NextResponse.json(
        { error: "Complete all four missions before submitting the rubric" },
        { status: 403 },
      );
    }

    const body = RubricSchema.parse(await req.json());
    const completionBadgeHash = createHash("sha256")
      .update(`fellow-lab-complete:${auth.fellow.id}:${Date.now()}`)
      .digest("hex");

    const submission = await prismaFellows.fellowRubricSubmission.upsert({
      where: { fellowId: auth.fellow.id },
      create: {
        fellowId: auth.fellow.id,
        quantitativeScore: body.quantitativeScore,
        lineageScore: body.lineageScore,
        isolationScore: body.isolationScore,
        velocityScore: body.velocityScore,
        mathFrictionNotes: body.mathFrictionNotes,
        academicUseDescription: body.academicUseDescription,
        workplaceFrictionJson: body.workplaceFrictionJson,
        requestBriefing: body.requestBriefing,
        opsCommercialLeadFlag: body.requestBriefing,
      },
      update: {
        quantitativeScore: body.quantitativeScore,
        lineageScore: body.lineageScore,
        isolationScore: body.isolationScore,
        velocityScore: body.velocityScore,
        mathFrictionNotes: body.mathFrictionNotes,
        academicUseDescription: body.academicUseDescription,
        workplaceFrictionJson: body.workplaceFrictionJson,
        requestBriefing: body.requestBriefing,
        opsCommercialLeadFlag: body.requestBriefing,
        submittedAt: new Date(),
      },
    });

    await prismaFellows.fellow.update({
      where: { id: auth.fellow.id },
      data: {
        completionBadgeHash,
        badgeIssuedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      submittedAt: submission.submittedAt.toISOString(),
      completionBadgeHash,
      note: "Lab completion receipt hash issued — not an industry certification.",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid rubric", details: error.flatten() },
        { status: 400 },
      );
    }
    console.error("[fellows/rubric]", error);
    return NextResponse.json({ error: "Rubric submit failed" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const auth = await requireActiveFellow(req);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const submission = await prismaFellows.fellowRubricSubmission.findUnique({
    where: { fellowId: auth.fellow.id },
  });

  return NextResponse.json({
    submitted: Boolean(submission),
    submission: submission
      ? {
          quantitativeScore: submission.quantitativeScore,
          lineageScore: submission.lineageScore,
          isolationScore: submission.isolationScore,
          velocityScore: submission.velocityScore,
          submittedAt: submission.submittedAt.toISOString(),
        }
      : null,
    completionBadgeHash: auth.fellow.completionBadgeHash,
  });
}
