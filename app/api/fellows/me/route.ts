import { NextRequest, NextResponse } from "next/server";

import { verifyFellowSessionToken } from "@/app/lib/fellows/session";
import {
  extendFellowsSandboxExpiry,
  isFellowsSandboxExpired,
} from "@/app/lib/fellows/sandboxTtl";
import { FELLOWS_SESSION_COOKIE } from "@/config/fellowsPortal";
import prismaFellows from "@/lib/prismaFellows";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const session = verifyFellowSessionToken(req.cookies.get(FELLOWS_SESSION_COOKIE)?.value);
  if (!session) {
    return NextResponse.json({ error: "Fellow session required" }, { status: 401 });
  }

  let fellow = await prismaFellows.fellow.findUnique({
    where: { id: session.fellowId },
    include: {
      missionProgress: { orderBy: { missionNumber: "asc" } },
      rubricSubmission: true,
    },
  });

  if (!fellow) {
    return NextResponse.json({ error: "Fellow not found" }, { status: 404 });
  }

  if (fellow.status !== "ACTIVE") {
    return NextResponse.json({ error: "Fellow not active" }, { status: 403 });
  }

  if (isFellowsSandboxExpired(fellow.sandboxExpiresAt)) {
    return NextResponse.json(
      { error: "Sandbox enclave expired — request access again to renew" },
      { status: 403 },
    );
  }

  // Activity extends the 60-day seat.
  const sandboxExpiresAt = extendFellowsSandboxExpiry();
  fellow = await prismaFellows.fellow.update({
    where: { id: fellow.id },
    data: { sandboxExpiresAt },
    include: {
      missionProgress: { orderBy: { missionNumber: "asc" } },
      rubricSubmission: true,
    },
  });

  const passedCount = fellow.missionProgress.filter((m) => m.status === "PASSED").length;

  return NextResponse.json({
    fellowId: fellow.id,
    fullName: fellow.fullName,
    email: fellow.email,
    status: fellow.status,
    tenantEnclaveId: fellow.tenantEnclaveId,
    academicTrack: fellow.academicTrack,
    sandboxExpiresAt: fellow.sandboxExpiresAt?.toISOString() ?? null,
    completionBadgeHash: fellow.completionBadgeHash,
    notesProductImprovementConsent: fellow.notesProductImprovementConsent,
    missions: fellow.missionProgress.map((m) => ({
      missionNumber: m.missionNumber,
      missionCode: m.missionCode,
      status: m.status,
      methodologyNotes: m.methodologyNotes,
      notesSavedAt: m.notesSavedAt?.toISOString() ?? null,
      completedAt: m.completedAt?.toISOString() ?? null,
    })),
    progress: {
      passedCount,
      totalMissions: 4,
      rubricUnlocked: passedCount >= 4,
      rubricSubmitted: Boolean(fellow.rubricSubmission),
    },
  });
}
