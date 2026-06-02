import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-static";

export async function GET() {
  const filePath = path.join(process.cwd(), "docs", "Ironframe-UI-UX-Feature-Test-Protocol.docx");

  if (!fs.existsSync(filePath)) {
    return new NextResponse("Testing protocol artifact missing from node directory storage.", {
      status: 404,
    });
  }

  const fileBuffer = fs.readFileSync(filePath);

  return new NextResponse(fileBuffer, {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": 'attachment; filename="Ironframe-UI-UX-Feature-Test-Protocol.docx"',
    },
  });
}
