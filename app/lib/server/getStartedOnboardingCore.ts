import "server-only";

import { createHash } from "node:crypto";

import prisma from "@/lib/prisma";

export { GET_STARTED_STEPS, type GetStartedStepId } from "@/app/lib/getStartedSteps";

export async function logGetStartedProgress(input: {
  tenantId: string;
  stepId: string;
  completed: boolean;
  allComplete?: boolean;
}): Promise<void> {
  const payload = {
    tag: "TRAINING_ONBOARDING",
    stepId: input.stepId,
    completed: input.completed,
    allComplete: Boolean(input.allComplete),
    outputHash: createHash("sha256")
      .update(`${input.stepId}:${input.completed}:${input.allComplete ?? false}`)
      .digest("hex")
      .slice(0, 16),
    occurredAt: new Date().toISOString(),
  };

  await prisma.agentLog
    .create({
      data: {
        tenantId: input.tenantId,
        message: JSON.stringify(payload).slice(0, 8_000),
      },
    })
    .catch((err: unknown) => {
      console.error("[Get Started] Audit log persistence failed:", err);
    });
}
