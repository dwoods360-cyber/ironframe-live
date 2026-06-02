import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  archiveComplianceReport,
  buildCanonicalExportPayloadBytes,
  type ArchiveClassification,
  type ArchiveFormat,
} from "@/src/services/ironquery/exportArchive";
import {
  verifyTamperEvidentSeal,
} from "@/src/services/ironquery/exportSigner";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type ExportRequestBody = {
  tenantId?: string;
  generatedByUserId?: string;
  format?: string;
  classification?: string;
  payload?: unknown;
};

function resolveExportToken(): string {
  return (
    process.env.IRONQUERY_EXPORT_TOKEN?.trim() ||
    process.env.IRONFRAME_CRON_SECRET?.trim() ||
    ""
  );
}

function authorizeRequest(request: NextRequest): boolean {
  const token = resolveExportToken();
  if (!token) return false;
  const auth = request.headers.get("authorization")?.trim() ?? "";
  return auth === `Bearer ${token}`;
}

function parseScopedTenant(request: NextRequest, bodyTenantId?: string): string {
  const tenantFromHeader = request.headers.get("x-tenant-id")?.trim() || "";
  const tenantId =
    request.nextUrl.searchParams.get("tenantId")?.trim() || bodyTenantId?.trim() || tenantFromHeader;
  if (!tenantId || !UUID_RE.test(tenantId)) {
    throw new Error("EPIC_16_EXPORT_TENANT_INVALID");
  }
  if (tenantFromHeader && tenantFromHeader !== tenantId) {
    throw new Error("EPIC_16_EXPORT_TENANT_MISMATCH");
  }
  return tenantId;
}

function parseFormat(raw: string | undefined): ArchiveFormat {
  const normalized = raw?.trim().toLowerCase() || "csv";
  if (normalized === "csv" || normalized === "pdf") return normalized;
  throw new Error("EPIC_16_EXPORT_FORMAT_INVALID");
}

function parseClassification(raw: string | undefined): ArchiveClassification {
  const normalized = raw?.trim().toLowerCase() || "forensic";
  if (normalized === "financial" || normalized === "forensic") return normalized;
  throw new Error("EPIC_16_EXPORT_CLASSIFICATION_INVALID");
}

function parseGeneratedByUserId(request: NextRequest, bodyGeneratedBy?: string): string {
  const userId =
    request.headers.get("x-user-id")?.trim() ||
    bodyGeneratedBy?.trim() ||
    "SYSTEM_IRONQUERY_EXPORT";
  if (!userId) {
    throw new Error("EPIC_16_EXPORT_USER_REQUIRED");
  }
  return userId;
}

export async function GET(request: NextRequest) {
  if (!authorizeRequest(request)) {
    return NextResponse.json({ ok: false, error: "UNAUTHORIZED_EXPORT_CONTEXT" }, { status: 401 });
  }

  try {
    const tenantId = parseScopedTenant(request);
    const rows = await prisma.evidenceArtifact.findMany({
      where: {
        tenantId,
        OR: [{ storagePath: { contains: "/financial/" } }, { storagePath: { contains: "/forensic/" } }],
        storagePath: { contains: "/ironquery/" },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        sha256: true,
        storagePath: true,
        createdAt: true,
        uploadedByUserId: true,
      },
    });

    return NextResponse.json({
      ok: true,
      tenantId,
      count: rows.length,
      history: rows.map((row) => ({
        artifactId: row.id,
        sha256: row.sha256,
        storagePath: row.storagePath,
        createdAt: row.createdAt.toISOString(),
        generatedByUserId: row.uploadedByUserId,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const status = /TENANT_MISMATCH/.test(message) ? 403 : 400;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}

export async function POST(request: NextRequest) {
  if (!authorizeRequest(request)) {
    return NextResponse.json({ ok: false, error: "UNAUTHORIZED_EXPORT_CONTEXT" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as ExportRequestBody;
    const tenantId = parseScopedTenant(request, body.tenantId);
    const generatedByUserId = parseGeneratedByUserId(request, body.generatedByUserId);
    const format = parseFormat(body.format);
    const classification = parseClassification(body.classification);
    if (body.payload == null) {
      throw new Error("EPIC_16_EXPORT_PAYLOAD_REQUIRED");
    }

    const archived = await archiveComplianceReport({
      tenantId,
      generatedByUserId,
      format,
      classification,
      payload: body.payload,
    });
    const sealCheck = verifyTamperEvidentSeal({
      payload: Buffer.from(buildCanonicalExportPayloadBytes(body.payload, format)).toString("base64"),
      seal: archived.seal,
    });

    return NextResponse.json(
      {
        ok: true,
        status: "CONFIRMED",
        tenantId,
        artifactId: archived.artifactId,
        storagePath: archived.storagePath,
        objectPath: archived.objectPath,
        canonicalSha256: archived.canonicalSha256,
        seal: archived.seal,
        sealCheck,
      },
      { status: 200 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const status = /TENANT_MISMATCH/.test(message) ? 403 : 400;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
