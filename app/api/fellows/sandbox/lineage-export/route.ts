import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { buildLabAuditRegister } from "@/app/lib/fellows/labFixtures";
import { issueFellowMissionReceipt } from "@/app/lib/fellows/receipts";
import { requireActiveFellow } from "@/app/lib/fellows/requireFellow";
import { generateCapstonePackage } from "@/lib/capstone/exportPackage";
import prismaFellows from "@/lib/prismaFellows";

export const runtime = "nodejs";

const ExportSchema = z.object({
  format: z.enum(["JSON", "CSV"]).default("JSON"),
});

function appendMethodologyNotes(
  content: string,
  format: "JSON" | "CSV",
  notes: Array<{ missionNumber: number; methodologyNotes: string }>,
): string {
  if (!notes.length) return content;
  if (format === "JSON") {
    const parsed = JSON.parse(content) as Record<string, unknown>;
    parsed.methodologyNotes = notes.map((n) => ({
      missionNumber: n.missionNumber,
      notes: n.methodologyNotes,
    }));
    return JSON.stringify(parsed, null, 2);
  }
  const block = [
    `# Methodology notes (student-authored; opt-in saved)`,
    ...notes.flatMap((n) => [
      `# --- Mission ${n.missionNumber} ---`,
      ...n.methodologyNotes.split(/\r?\n/).map((line) => `# ${line}`),
    ]),
    ``,
  ].join("\n");
  return `${block}${content}`;
}

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

    const savedNotes = await prismaFellows.fellowMission.findMany({
      where: {
        fellowId: auth.fellow.id,
        methodologyNotes: { not: null },
      },
      orderBy: { missionNumber: "asc" },
      select: { missionNumber: true, methodologyNotes: true },
    });
    const notes = savedNotes
      .filter((n): n is { missionNumber: number; methodologyNotes: string } =>
        Boolean(n.methodologyNotes?.trim()),
      )
      .map((n) => ({
        missionNumber: n.missionNumber,
        methodologyNotes: n.methodologyNotes!.trim(),
      }));

    let pkg = generateCapstonePackage(
      records,
      {
        fellowId: auth.fellow.id,
        tenantEnclaveId: auth.fellow.tenantEnclaveId,
        academicTrack: auth.fellow.academicTrack,
        exportedAtUtc,
        version: "fellows-lab-1.1",
      },
      body.format,
    );

    if (notes.length) {
      const content = appendMethodologyNotes(pkg.content, body.format, notes);
      const { createHash } = await import("node:crypto");
      const exportPackageHash = createHash("sha256").update(content, "utf8").digest("hex");
      pkg = {
        ...pkg,
        content,
        exportPackageHash,
        manifest: {
          ...pkg.manifest,
          sha256: exportPackageHash,
          byteLength: Buffer.byteLength(content, "utf8"),
        },
      };
    }

    const receipt = await issueFellowMissionReceipt({
      fellowId: auth.fellow.id,
      missionCode: "LINEAGE",
      payload: {
        format: pkg.format,
        fileName: pkg.fileName,
        exportPackageHash: pkg.exportPackageHash,
        recordCount: pkg.recordCount,
        byteLength: pkg.manifest.byteLength,
        methodologyNotesIncluded: notes.length,
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
        methodologyNotesIncluded: notes.length,
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
