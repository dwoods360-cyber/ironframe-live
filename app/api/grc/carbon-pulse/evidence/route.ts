import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import prisma from "@/lib/prisma";
import { assertAuthenticatedIronguardTenantOr403 } from "@/app/lib/security/tenantMembershipGuard";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const guard = await assertAuthenticatedIronguardTenantOr403(request);
  if (!guard.ok) return guard.response;
  const tenantId = guard.tenantUuid;
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
