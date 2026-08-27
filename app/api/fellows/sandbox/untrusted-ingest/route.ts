import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { LAB_UNTRUSTED_VENDOR_ARTIFACT } from "@/app/lib/fellows/labFixtures";
import { issueFellowMissionReceipt } from "@/app/lib/fellows/receipts";
import { requireActiveFellow } from "@/app/lib/fellows/requireFellow";

export const runtime = "nodejs";

const IngestSchema = z.object({
  action: z.literal("promote_to_executive_pack"),
  artifactId: z.string().min(1),
});

/**
 * Mission 02 — quarantine-before-trust.
 * Promoting an unverified vendor questionnaire must be blocked server-side with a receipt.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireActiveFellow(req);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = IngestSchema.parse(await req.json());

    if (body.artifactId !== LAB_UNTRUSTED_VENDOR_ARTIFACT.artifactId) {
      return NextResponse.json(
        { error: "Unknown lab artifact — use the synthetic vendor questionnaire id" },
        { status: 400 },
      );
    }

    const quarantineReason =
      "QUARANTINE_BEFORE_TRUST: artifact verificationStatus=UNVERIFIED — cannot promote to executive pack";

    const receipt = await issueFellowMissionReceipt({
      fellowId: auth.fellow.id,
      missionCode: "INGEST",
      payload: {
        action: body.action,
        artifactId: body.artifactId,
        verificationStatus: LAB_UNTRUSTED_VENDOR_ARTIFACT.verificationStatus,
        promoted: false,
        quarantineBlocked: true,
        quarantineReason,
      },
    });

    return NextResponse.json(
      {
        ok: false,
        missionCode: "INGEST",
        promoted: false,
        quarantineBlocked: true,
        quarantineReason,
        artifact: LAB_UNTRUSTED_VENDOR_ARTIFACT,
        receiptId: receipt.receiptId,
        receiptToken: receipt.receiptToken,
        expiresAt: receipt.expiresAt.toISOString(),
      },
      { status: 422 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid ingest probe", details: error.flatten() },
        { status: 400 },
      );
    }
    console.error("[fellows/untrusted-ingest]", error);
    return NextResponse.json({ error: "Ingest probe failed" }, { status: 500 });
  }
}
