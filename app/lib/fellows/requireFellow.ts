import "server-only";

import type { NextRequest } from "next/server";

import { verifyFellowSessionToken } from "@/app/lib/fellows/session";
import {
  extendFellowsSandboxExpiry,
  isFellowsSandboxExpired,
} from "@/app/lib/fellows/sandboxTtl";
import { FELLOWS_SESSION_COOKIE } from "@/config/fellowsPortal";
import prismaFellows from "@/lib/prismaFellows";
import type { Fellow } from "@/prisma/generated/fellows-client";

export async function requireActiveFellow(
  req: NextRequest,
): Promise<{ fellow: Fellow } | { error: string; status: number }> {
  const session = verifyFellowSessionToken(req.cookies.get(FELLOWS_SESSION_COOKIE)?.value);
  if (!session) {
    return { error: "Fellow session required", status: 401 };
  }

  const fellow = await prismaFellows.fellow.findUnique({ where: { id: session.fellowId } });
  if (!fellow) {
    return { error: "Fellow not found", status: 404 };
  }
  if (fellow.status !== "ACTIVE") {
    return { error: "Fellow not active", status: 403 };
  }
  if (isFellowsSandboxExpired(fellow.sandboxExpiresAt)) {
    return { error: "Sandbox enclave expired — request access again to renew", status: 403 };
  }

  // Lab activity extends the 60-day seat.
  const sandboxExpiresAt = extendFellowsSandboxExpiry();
  const updated = await prismaFellows.fellow.update({
    where: { id: fellow.id },
    data: { sandboxExpiresAt },
  });

  return { fellow: updated };
}
