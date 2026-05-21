import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { NextResponse } from "next/server";
import { verifyInvestorReportDownloadToken } from "@/app/lib/investorReportShareToken";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("t")?.trim();
  if (!token) {
    return NextResponse.json({ ok: false, error: "Missing token." }, { status: 400 });
  }

  const payload = verifyInvestorReportDownloadToken(token);
  if (!payload) {
    return NextResponse.json({ ok: false, error: "Invalid or expired link." }, { status: 401 });
  }

  const abs = join(process.cwd(), "storage", "investor-reports", ...payload.relPath.split("/"));
  if (!existsSync(abs)) {
    return NextResponse.json({ ok: false, error: "Report file not found." }, { status: 404 });
  }

  const buf = readFileSync(abs);
  return new NextResponse(buf, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="Sustainability_Achievement_Report_V1.pdf"',
      "Cache-Control": "private, no-store",
    },
  });
}
