import prisma from "@/lib/prisma";
import { checkBoardFeedAuth } from "@/app/api/internal/cron/cronAuth";
import { buildBoardFeedRssXml } from "@/app/lib/governanceFrame/boardFeedXml";

export async function GET(req: Request) {
  if (!checkBoardFeedAuth(req)) {
    return new Response("Unauthorized Gateway Access", { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const tenantId = searchParams.get("tenantId")?.trim() || undefined;

  try {
    const briefings = await prisma.publishedBriefing.findMany({
      where: tenantId ? { tenantId } : undefined,
      orderBy: { createdAt: "desc" },
      take: 20,
    });

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
