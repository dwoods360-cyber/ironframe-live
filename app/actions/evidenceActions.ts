"use server";

import { createHash, randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseSessionUser } from "@/app/utils/serverAuth";

type EvidenceUploadInput = {
  fileData: Blob | ArrayBuffer | Uint8Array | string;
  fileName: string;
  mimeType: string;
};

type ThreatTenantContext = {
  threatId: string;
  tenantId: string;
  threatCompanyId: bigint;
};

function sanitizeFileName(fileName: string): string {
  const trimmed = fileName.trim();
  const fallback = "artifact.bin";
  if (!trimmed) return fallback;
  return trimmed.replace(/[^a-zA-Z0-9._-]/g, "_");
}

async function normalizeInputToBytes(input: EvidenceUploadInput["fileData"]): Promise<Uint8Array> {
  if (input instanceof Uint8Array) return input;
  if (input instanceof ArrayBuffer) return new Uint8Array(input);
  if (typeof Blob !== "undefined" && input instanceof Blob) {
    return new Uint8Array(await input.arrayBuffer());
  }
  if (typeof input === "string") {
    const candidate = input.trim();
    const base64Payload = candidate.startsWith("data:")
      ? candidate.slice(candidate.indexOf(",") + 1)
      : candidate;
    return new Uint8Array(Buffer.from(base64Payload, "base64"));
  }
  throw new Error("Unsupported fileData payload.");
}

async function resolveThreatTenantContext(threatId: string): Promise<ThreatTenantContext | null> {
  const threat = await prisma.threatEvent.findUnique({
    where: { id: threatId },
    select: { id: true, tenantCompanyId: true },
  });
  if (!threat?.tenantCompanyId) return null;

  const company = await prisma.company.findUnique({
    where: { id: threat.tenantCompanyId },
    select: { tenantId: true },
  });
  if (!company?.tenantId) return null;

  return {
    threatId: threat.id,
    tenantId: company.tenantId,
    threatCompanyId: threat.tenantCompanyId,
  };
}

async function resolveThreatEntityId(inputId: string): Promise<string | null> {
  const direct = await prisma.threatEvent.findUnique({
    where: { id: inputId },
    select: { id: true },
  });
  if (direct?.id) return direct.id;

  const synthetic = await (prisma as any).syntheticEmployee.findUnique({
    where: { id: inputId },
    select: { email: true },
  });
  const email = typeof synthetic?.email === "string" ? synthetic.email.trim() : "";
  if (!email) return null;

  const linked = await prisma.threatEvent.findFirst({
    where: { targetEntity: email },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
  return linked?.id ?? null;
}

async function writeArtifactToStorage(params: {
  tenantId: string;
  fileName: string;
  mimeType: string;
  bytes: Uint8Array;
}): Promise<{ storagePath: string }> {
  const bucket = (process.env.EVIDENCE_STORAGE_BUCKET ?? "evidence-locker").trim();
  const safeName = sanitizeFileName(params.fileName);
  const objectPath = `${params.tenantId}/${Date.now()}-${randomUUID()}-${safeName}`;

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.storage.from(bucket).upload(objectPath, params.bytes, {
      upsert: false,
      contentType: params.mimeType || "application/octet-stream",
    });
    if (!error) {
      return { storagePath: `supabase://${bucket}/${objectPath}` };
    }
  } catch {
    // Fall through to local evidence directory.
  }

  const localRelative = path.join("uploads", "evidence", params.tenantId, `${Date.now()}-${safeName}`);
  const localAbsolute = path.join(process.cwd(), localRelative);
  await mkdir(path.dirname(localAbsolute), { recursive: true });
  await writeFile(localAbsolute, Buffer.from(params.bytes));
  return { storagePath: localRelative.replace(/\\/g, "/") };
}

export async function finalizeArtifactUpload(
  input: EvidenceUploadInput,
): Promise<{ success: true; artifactId: string } | { success: false; error: string }> {
  const user = await getSupabaseSessionUser();
  const userId = user?.id?.trim() || user?.email?.trim() || "";
  if (!userId) return { success: false, error: "Authentication required." };

  const fileName = input.fileName?.trim();
  const mimeType = input.mimeType?.trim();
  if (!fileName) return { success: false, error: "fileName is required." };
  if (!mimeType) return { success: false, error: "mimeType is required." };

  // Tenant-scoped writes are mandatory for artifact persistence.
  const tenantRole = await prisma.userRoleAssignment.findFirst({
    where: { userId },
    select: { tenantId: true },
    orderBy: { grantedAt: "desc" },
  });
  if (!tenantRole?.tenantId) {
    return { success: false, error: "No tenant role assignment found for user." };
  }

  try {
    const bytes = await normalizeInputToBytes(input.fileData);
    if (bytes.byteLength < 1) {
      return { success: false, error: "Cannot upload an empty file." };
    }

    const sha256 = createHash("sha256").update(bytes).digest("hex");
    const stored = await writeArtifactToStorage({
      tenantId: tenantRole.tenantId,
      fileName,
      mimeType,
      bytes,
    });

    const artifact = await prisma.evidenceArtifact.create({
      data: {
        tenantId: tenantRole.tenantId,
        uploadedByUserId: userId,
        sha256,
        storagePath: stored.storagePath,
        mimeType,
      },
      select: { id: true },
    });

    revalidatePath("/");
    return { success: true, artifactId: artifact.id };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to finalize upload.";
    return { success: false, error: message };
  }
}

export async function attachEvidenceToThreat(
  artifactId: string,
  threatId: string,
  note?: string,
): Promise<{ success: true } | { success: false; error: string }> {
  const aid = artifactId.trim();
  const tid = threatId.trim();
  const normalizedNote = note?.trim() || null;
  if (!aid) return { success: false, error: "artifactId is required." };
  if (!tid) return { success: false, error: "threatId is required." };

  const user = await getSupabaseSessionUser();
  const userId = user?.id?.trim() || user?.email?.trim() || "";
  if (!userId) return { success: false, error: "Authentication required." };

  try {
    const tenantCtx = await resolveThreatTenantContext(tid);
    if (!tenantCtx) {
      return { success: false, error: "Threat not found or tenant context missing." };
    }

    const artifact = await prisma.evidenceArtifact.findFirst({
      where: { id: aid, tenantId: tenantCtx.tenantId },
      select: { id: true, sha256: true },
    });
    if (!artifact) {
      return { success: false, error: "Artifact not found in this tenant scope." };
    }

    await prisma.$transaction(async (tx) => {
      await tx.evidenceAttachment.create({
        data: {
          tenantId: tenantCtx.tenantId,
          artifactId: artifact.id,
          entityType: "THREAT_EVENT",
          entityId: tenantCtx.threatId,
          attachedByUserId: userId,
          attachmentNote: normalizedNote,
        },
      });

      await tx.integrityEvent.create({
        data: {
          tenantId: tenantCtx.tenantId,
          eventType: "EVIDENCE_ATTACHED",
          message: `Artifact ${artifact.sha256} attached to Threat ${tenantCtx.threatId}`,
          actorUserId: userId,
        },
      });
    });

    revalidatePath("/");
    revalidatePath("/integrity");
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to attach evidence.";
    return { success: false, error: message };
  }
}

export type EvidenceAttachmentListItem = {
  attachmentId: string;
  entityType: "THREAT_EVENT" | "BOT_AUDIT_LOG" | "AUDIT_LOG" | "INTEGRITY_EVENT";
  entityId: string;
  attachmentNote: string | null;
  createdAt: string;
  artifactId: string;
  sha256: string;
  mimeType: string;
  storagePath: string;
};

export async function listEvidenceForThreatEntity(
  entityId: string,
): Promise<{ ok: true; items: EvidenceAttachmentListItem[] } | { ok: false; items: []; error: string }> {
  const inputId = entityId.trim();
  if (!inputId) return { ok: false, items: [], error: "Missing entity id." };

  const user = await getSupabaseSessionUser();
  const userId = user?.id?.trim() || user?.email?.trim() || "";
  if (!userId) return { ok: false, items: [], error: "Authentication required." };

  try {
    const eid = await resolveThreatEntityId(inputId);
    if (!eid) return { ok: true, items: [] };

    const tenantRole = await prisma.userRoleAssignment.findFirst({
      where: { userId },
      select: { tenantId: true },
      orderBy: { grantedAt: "desc" },
    });
    if (!tenantRole?.tenantId) {
      return { ok: false, items: [], error: "No tenant role assignment found for user." };
    }

    const rows = await prisma.evidenceAttachment.findMany({
      where: {
        tenantId: tenantRole.tenantId,
        entityType: "THREAT_EVENT",
        entityId: eid,
      },
      orderBy: { createdAt: "desc" },
      include: {
        artifact: {
          select: {
            id: true,
            sha256: true,
            mimeType: true,
            storagePath: true,
          },
        },
      },
    });

    return {
      ok: true,
      items: rows.map((row) => ({
        attachmentId: row.id,
        entityType: row.entityType,
        entityId: row.entityId,
        attachmentNote: row.attachmentNote,
        createdAt: row.createdAt.toISOString(),
        artifactId: row.artifact.id,
        sha256: row.artifact.sha256,
        mimeType: row.artifact.mimeType,
        storagePath: row.artifact.storagePath,
      })),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load evidence.";
    return { ok: false, items: [], error: message };
  }
}
