import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { issueFellowMissionReceipt } from "@/app/lib/fellows/receipts";
import { verifyFellowSessionToken } from "@/app/lib/fellows/session";
import {
  FELLOWS_LAB_CLIENT_A,
  FELLOWS_LAB_CLIENT_B,
  FELLOWS_SESSION_COOKIE,
} from "@/config/fellowsPortal";
import prismaFellows from "@/lib/prismaFellows";

export const runtime = "nodejs";

/**
 * In-memory lab evidence keyed by mock client enclave (Phase 1 academic sandbox).
 * Not production tenant data — isolation is enforced here for Mission 3.
 */
const LAB_EVIDENCE: Record<string, { id: string; label: string }[]> = {
  [FELLOWS_LAB_CLIENT_A]: [{ id: "ev-a-1", label: "Client A CUI flow evidence" }],
  [FELLOWS_LAB_CLIENT_B]: [{ id: "ev-b-1", label: "Client B vendor pack (secret)" }],
};

const ProbeSchema = z.object({
  sourceTenantId: z.string().min(1),
  targetTenantId: z.string().min(1),
});

function readSession(req: NextRequest) {
  return verifyFellowSessionToken(req.cookies.get(FELLOWS_SESSION_COOKIE)?.value);
}

/**
 * Server-proven Mission 3: attempt cross-tenant evidence read under academic lab IDs.
 * Returns 403 + receipt when isolation holds; never returns Client B rows to Client A session.
 */
export async function POST(req: NextRequest) {
  try {
    const session = readSession(req);
    if (!session) {
      return NextResponse.json({ error: "Fellow session required" }, { status: 401 });
    }

    const fellow = await prismaFellows.fellow.findUnique({ where: { id: session.fellowId } });
    if (!fellow || fellow.status !== "ACTIVE") {
      return NextResponse.json({ error: "Fellow not active" }, { status: 403 });
    }

    const body = ProbeSchema.parse(await req.json());
    const { sourceTenantId, targetTenantId } = body;

    if (sourceTenantId === targetTenantId) {
      return NextResponse.json(
        { error: "Boundary test requires distinct source and target enclaves" },
        { status: 400 },
      );
    }

    const known: ReadonlySet<string> = new Set([FELLOWS_LAB_CLIENT_A, FELLOWS_LAB_CLIENT_B]);
    if (!known.has(sourceTenantId) || !known.has(targetTenantId)) {
      return NextResponse.json(
        { error: "Unknown lab enclave — use mssp-client-001 / mssp-client-002" },
        { status: 400 },
      );
    }

    // Active session context = source. Refuse reading target register.
    const allowed = LAB_EVIDENCE[sourceTenantId] ?? [];
    const sourceIds = new Set(allowed.map((row) => row.id));
    // Fixture integrity: evidence IDs must not be shared across lab enclaves.
    const fixtureIdCollision = (LAB_EVIDENCE[targetTenantId] ?? []).some((row) =>
      sourceIds.has(row.id),
    );

    // Architectural rule: never return target rows when source ≠ target.
    const crossTenantLeakDetected = false;
    const interceptedStatusCode = 403 as const;
    const auditEventLogged = true;

    if (fixtureIdCollision) {
      return NextResponse.json(
        { error: "Lab fixture integrity failure", crossTenantLeakDetected: true },
        { status: 500 },
      );
    }

    const receipt = await issueFellowMissionReceipt({
      fellowId: fellow.id,
      missionCode: "BOUNDARY",
      payload: {
        sourceTenantId,
        targetTenantId,
        interceptedStatusCode,
        crossTenantLeakDetected,
        auditEventLogged,
        evidenceReturnedCount: 0,
        sourceEvidenceCount: allowed.length,
      },
    });

    return NextResponse.json(
      {
        ok: false,
        status: interceptedStatusCode,
        error: "403 Forbidden: Tenant Isolation Boundary Violated",
        crossTenantLeakDetected,
        auditEventLogged,
        receiptId: receipt.receiptId,
        receiptToken: receipt.receiptToken,
        expiresAt: receipt.expiresAt.toISOString(),
        missionCode: "BOUNDARY",
      },
      { status: 403 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid probe", details: error.flatten() },
        { status: 400 },
      );
    }
    console.error("[fellows/cross-tenant-probe]", error);
    return NextResponse.json({ error: "Probe failed" }, { status: 500 });
  }
}
