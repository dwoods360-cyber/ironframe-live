import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

import { requireSessionForDocumentationApi } from "@/app/lib/auth/requireSessionApi";

/** FS-backed docs ingress — must stay literal for Next.js static analysis (see docsRouteRuntime.ts). */
export const dynamic = "force-dynamic";

export async function GET() {
  const denied = await requireSessionForDocumentationApi();
  if (denied) return denied;

  const filePath = path.join(process.cwd(), "docs", "Ironframe-UI-UX-Feature-Test-Matrix.csv");

  if (!fs.existsSync(filePath)) {
    return new NextResponse(
      "Testing matrix spreadsheet artifact is missing from the directory repository.",
      { status: 404 },
    );
  }

  const fileBuffer = fs.readFileSync(filePath);

  return new NextResponse(fileBuffer, {
    status: 200,
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": 'attachment; filename="Ironframe-UI-UX-Feature-Test-Matrix.csv"',
    },
  });
}
