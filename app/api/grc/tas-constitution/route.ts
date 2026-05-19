import { readFileSync } from "fs";
import { join } from "path";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Read-only constitutional excerpt for client drafting assistant (TAS.md).
 * Does not expose arbitrary paths — fixed file under repo `docs/`.
 */
export async function GET() {
  try {
    const p = join(process.cwd(), "docs", "TAS.md");
    const raw = readFileSync(p, "utf8");
    const excerpt = raw.slice(0, 4000);
    return NextResponse.json(
      { excerpt, versionLine: raw.split(/\r?\n/).find((l) => /^Version:/i.test(l)) ?? null },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { excerpt: "", error: "TAS.md unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
