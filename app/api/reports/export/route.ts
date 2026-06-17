import { NextResponse } from "next/server";

import {
  getSharedBoardContext,
  serializeBoardContextPayload,
} from "@/app/lib/board/sharedBoardContext";
import {
  buildGovernanceTriadCsv,
  buildGovernanceTriadPrintHtml,
} from "@/app/lib/reports/governanceTriadSanitizer";

export const dynamic = "force-dynamic";

/**
 * Epic 16 — Enhanced Governance Frame Triad export.
 * GET ?format=csv | print | html (default: csv)
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const format = (url.searchParams.get("format") ?? "csv").trim().toLowerCase();

  try {
    const payload = await getSharedBoardContext();
    const stamp = payload.timestamp.replace(/[:.]/g, "-");

    if (format === "print" || format === "html") {
      const html = buildGovernanceTriadPrintHtml(payload);
      return new NextResponse(html, {
        status: 200,
        headers: {
          "content-type": "text/html; charset=utf-8",
          "cache-control": "no-store",
        },
      });
    }

    if (format !== "csv") {
      return NextResponse.json(
        { ok: false, error: "Unsupported format. Use ?format=csv or ?format=print" },
        { status: 400 },
      );
    }

    const csv = buildGovernanceTriadCsv(payload);
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="governance-frame-triad-${stamp}.csv"`,
        "cache-control": "no-store",
        "x-export-telemetry-digest": Buffer.from(serializeBoardContextPayload(payload))
          .toString("base64")
          .slice(0, 32),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Governance triad export failed.";
    const status = message.startsWith("UNAUTHORIZED_ACCESS") ? 401 : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
