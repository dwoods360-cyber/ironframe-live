import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { buildLabAuditRegister } from "@/app/lib/fellows/labFixtures";
import { issueFellowMissionReceipt } from "@/app/lib/fellows/receipts";
import { requireActiveFellow } from "@/app/lib/fellows/requireFellow";
import { generateCapstonePackage } from "@/lib/capstone/exportPackage";

export const runtime = "nodejs";

const ExportSchema = z.object({
  format: z.enum(["JSON", "CSV"]).default("JSON"),
});

/**
 * Mission 04 — lineage trail + SHA-256 export pack (server-hashed).
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireActiveFellow(req);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const raw = await req.json().catch(() => ({}));
    const body = ExportSchema.parse(raw);
    const fellowShort = auth.fellow.id.replace(/-/g, "").slice(0, 8);
    const records = buildLabAuditRegister(fellowShort);
    const exportedAtUtc = new Date().toISOString();

    const pkg = generateCapstonePackage(
      records,
      {
        fellowId: auth.fellow.id,
        tenantEnclaveId: auth.fellow.tenantEnclaveId,
        academicTrack: auth.fellow.academicTrack,
        exportedAtUtc,
        version: "fellows-lab-1.0",
      },
      body.format,
    );

    const receipt = await issueFellowMissionReceipt({
      fellowId: auth.fellow.id,
      missionCode: "LINEAGE",
      payload: {
        format: pkg.format,
        fileName: pkg.fileName,
        exportPackageHash: pkg.exportPackageHash,
        recordCount: pkg.recordCount,
        byteLength: pkg.manifest.byteLength,
        lineageFields: [
          "controlId",
          "collectorId",
          "ingestTimestampUtc",
          "scopeHash",
          "operatorSignOff",
          "verificationStatus",
        ],
      },
    });

    return NextResponse.json({
      ok: true,
      missionCode: "LINEAGE",
      package: {
        format: pkg.format,
        fileName: pkg.fileName,
        mimeType: pkg.mimeType,
        content: pkg.content,
        exportPackageHash: pkg.exportPackageHash,
        recordCount: pkg.recordCount,
        byteLength: pkg.manifest.byteLength,
      },
      receiptId: receipt.receiptId,
      receiptToken: receipt.receiptToken,
      expiresAt: receipt.expiresAt.toISOString(),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid export request", details: error.flatten() },
        { status: 400 },
      );
    }
    console.error("[fellows/lineage-export]", error);
    return NextResponse.json({ error: "Lineage export failed" }, { status: 500 });
  }
}
