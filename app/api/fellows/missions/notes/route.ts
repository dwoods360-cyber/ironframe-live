import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { requireActiveFellow } from "@/app/lib/fellows/requireFellow";
import prismaFellows from "@/lib/prismaFellows";

export const runtime = "nodejs";

const MISSION_CODE = {
  1: "EXPOSURE",
  2: "INGEST",
  3: "BOUNDARY",
  4: "LINEAGE",
} as const;

const NotesSchema = z.object({
  missionNumber: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  methodologyNotes: z.string().trim().max(2000),
  /** Opt-in: save for student export + anonymized product Eyes (not sales outreach). */
  productImprovementConsent: z.boolean(),
});

/**
 * Save short per-mission methodology / audit notes.
 * Requires explicit consent to persist; empty notes clear the field.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireActiveFellow(req);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = NotesSchema.parse(await req.json());
    const missionCode = MISSION_CODE[body.missionNumber];
    const notes = body.methodologyNotes;
    const now = new Date();

    if (!body.productImprovementConsent && notes.length > 0) {
      return NextResponse.json(
        {
          error:
            "Consent required to save notes (export + anonymous product improvement — not sales outreach)",
        },
        { status: 400 },
      );
    }

    await prismaFellows.fellow.update({
      where: { id: auth.fellow.id },
      data: {
        notesProductImprovementConsent: body.productImprovementConsent,
      },
    });

    const row = await prismaFellows.fellowMission.upsert({
      where: {
        fellowId_missionNumber: {
          fellowId: auth.fellow.id,
          missionNumber: body.missionNumber,
        },
      },
      create: {
        fellowId: auth.fellow.id,
        missionNumber: body.missionNumber,
        missionCode,
        status: "IN_PROGRESS",
        methodologyNotes: notes.length > 0 ? notes : null,
        notesSavedAt: notes.length > 0 ? now : null,
        startedAt: now,
      },
      update: {
        methodologyNotes: notes.length > 0 ? notes : null,
        notesSavedAt: notes.length > 0 ? now : null,
      },
      select: {
        missionNumber: true,
        methodologyNotes: true,
        notesSavedAt: true,
        status: true,
      },
    });

    return NextResponse.json({
      success: true,
      mission: row,
      notesProductImprovementConsent: body.productImprovementConsent,
      note: "Saved for your export continuity. Product review is anonymized Eyes feedback only — not a sales lead.",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid notes", details: error.flatten() },
        { status: 400 },
      );
    }
    console.error("[fellows/missions/notes]", error);
    return NextResponse.json({ error: "Unable to save notes" }, { status: 500 });
  }
}
