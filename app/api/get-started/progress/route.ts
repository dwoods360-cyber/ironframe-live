import { NextRequest, NextResponse } from "next/server";

import { logGetStartedProgress } from "@/app/lib/server/getStartedOnboardingCore";
import { assertIronguardApiTenantOr403 } from "@/app/lib/security/ironguardApiGuard";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const guard = await assertIronguardApiTenantOr403(req);
  if (!guard.ok) {
    return guard.response;
  }

  let body: { stepId?: unknown; completed?: unknown; allComplete?: unknown };
  try {
    body = (await req.json()) as { stepId?: unknown; completed?: unknown; allComplete?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const stepId = typeof body.stepId === "string" ? body.stepId.trim() : "";
  if (!stepId) {
    return NextResponse.json({ error: "stepId is required." }, { status: 400 });
  }

  await logGetStartedProgress({
    tenantId: guard.tenantUuid!,
    stepId,
    completed: body.completed === true,
    allComplete: body.allComplete === true,
  });

  return NextResponse.json({ status: "LOGGED" });
}
