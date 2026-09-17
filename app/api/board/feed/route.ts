import { NextResponse } from "next/server";
import { checkBoardFeedAuth } from "@/app/api/internal/cron/cronAuth";
import { buildBoardFeedRssXml } from "@/app/lib/governanceFrame/boardFeedXml";
import { withIronguardTenant } from "@/app/lib/server/ironguardSessionTenant";

const TENANT_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(req: Request) {
  if (!checkBoardFeedAuth(req)) {
    return new Response("Unauthorized Gateway Access", { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const tenantId = searchParams.get("tenantId")?.trim() || "";
  if (!TENANT_UUID_RE.test(tenantId)) {
    return NextResponse.json(
      { error: "tenantId query parameter (UUID) is required." },
      { status: 400 },
    );
  }

  try {
    const briefings = await withIronguardTenant(tenantId, async (tx) =>
      tx.publishedBriefing.findMany({
        where: { tenantId },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
    );

    const xml = buildBoardFeedRssXml(
      briefings.map((item) => ({
        id: item.id,
        title: item.title,
        content: item.content,
        exposureCents: item.exposureCents,
        createdAt: item.createdAt,
      })),
    );

    return new Response(xml, {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "s-maxage=600, stale-while-revalidate",
      },
    });
  } catch (error) {
    console.error("❌ [DATABASE RSS FAULT]:", error);
    return new Response("Internal Syndication Failure", { status: 500 });
  }
}
