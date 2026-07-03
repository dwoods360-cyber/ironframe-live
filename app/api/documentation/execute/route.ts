import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { APP_DOCUMENT_READING_LEVELS } from "@/lib/appDocumentSlug";
import { upsertAppDocument } from "@/app/lib/server/appDocumentStore";
import { mirrorAppDocumentToFilesystem } from "@/app/lib/server/appDocumentFilesystemMirror";
import {
  checkInternalGatewayBearerAuth,
  internalGatewayUnauthorizedResponse,
} from "@/app/lib/server/internalGatewayAuth";

export const dynamic = "force-dynamic";

const payloadSchema = z.object({
  slug: z.string().min(1),
  title: z.string().min(1),
  content: z.string().min(1),
  readingLevel: z.enum(APP_DOCUMENT_READING_LEVELS),
});

export async function POST(req: NextRequest) {
  if (!checkInternalGatewayBearerAuth(req)) {
    return internalGatewayUnauthorizedResponse();
  }

  try {
    const body: unknown = await req.json();
    const parsed = payloadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "Missing Required Struct Documentation Fields", issues: parsed.error.issues },
        { status: 400 },
      );
    }

    const updatedDocument = await upsertAppDocument(parsed.data);

    const mirroredPath = mirrorAppDocumentToFilesystem(
      updatedDocument.slug,
      updatedDocument.content,
    );

    console.info(
      `[documentation/execute] AppDocument upsert synchronized slug=${updatedDocument.slug} id=${updatedDocument.id}${mirroredPath ? ` mirrored=${mirroredPath}` : ""}`,
    );

    return NextResponse.json(
      {
        ok: true,
        status: "synchronized",
        documentId: updatedDocument.id,
        targetSlug: updatedDocument.slug,
        readingLevel: updatedDocument.readingLevel,
        updatedAt: updatedDocument.updatedAt.toISOString(),
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("[Autonomous Documentation Pipeline Exception]", error);
    const message = error instanceof Error ? error.message : "Internal Database System Synchronization Failure";
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 },
    );
  }
}
