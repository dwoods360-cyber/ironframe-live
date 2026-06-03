import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-static";

export async function GET() {
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
