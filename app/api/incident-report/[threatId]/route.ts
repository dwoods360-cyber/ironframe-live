import { readFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCompanyIdForActiveTenant } from "@/app/lib/grc/clearanceThreatResolve";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function parseStoredPath(
  stored: string,
): { kind: "supabase"; bucket: string; objectPath: string } | { kind: "local"; relative: string } {
  if (stored.startsWith("supabase://")) {
    const rest = stored.slice("supabase://".length);
    const i = rest.indexOf("/");
    return { kind: "supabase", bucket: rest.slice(0, i), objectPath: rest.slice(i + 1) };
  }
  return { kind: "local", relative: stored };
}

export async function GET(_req: Request, ctx: { params: Promise<{ threatId: string }> }) {
  const { threatId } = await ctx.params;
  const companyId = await getCompanyIdForActiveTenant();
  if (companyId == null) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const row = await prisma.riskEvent.findFirst({
    where: { id: threatId, tenantCompanyId: companyId },
    select: { postMortemReportPath: true },
  });
  if (!row?.postMortemReportPath) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const parsed = parseStoredPath(row.postMortemReportPath);
  let buf: Buffer;

  if (parsed.kind === "local") {
    const abs = path.join(process.cwd(), parsed.relative);
    buf = await readFile(abs);
  } else {
    const supabase = await createClient();
    const { data, error } = await supabase.storage.from(parsed.bucket).download(parsed.objectPath);
    if (error || !data) {
      return NextResponse.json({ error: "Storage read failed" }, { status: 500 });
    }
    buf = Buffer.from(await data.arrayBuffer());
  }

  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="ironframe-post-mortem-${threatId.slice(0, 8)}.pdf"`,
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
