import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import prisma from "@/lib/prisma";
import { getActiveTenantUuidFromCookies } from "@/app/utils/serverTenantContext";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const tenantId = await getActiveTenantUuidFromCookies();
  if (!tenantId) {
    return NextResponse.json({ ok: false, error: "No active tenant." }, { status: 400 });
  }

  const artifactId = new URL(request.url).searchParams.get("artifactId")?.trim();
  if (!artifactId) {
    return NextResponse.json({ ok: false, error: "artifactId required." }, { status: 400 });
  }

  const artifact = await prisma.evidenceArtifact.findFirst({
    where: { id: artifactId, tenantId },
    select: { id: true, sha256: true, storagePath: true, createdAt: true, mimeType: true },
  });
  if (!artifact) {
    return NextResponse.json({ ok: false, error: "Artifact not found." }, { status: 404 });
  }

  let canonical: string | null = null;
  try {
    const abs = path.join(process.cwd(), artifact.storagePath);
    canonical = await readFile(abs, "utf8");
  } catch {
    canonical = null;
  }

  return NextResponse.json({
    ok: true,
    artifact: {
      id: artifact.id,
      sha256: artifact.sha256,
      storagePath: artifact.storagePath,
      createdAt: artifact.createdAt.toISOString(),
      mimeType: artifact.mimeType,
    },
    canonical,
  });
}
