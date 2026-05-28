import "server-only";

import { createHash } from "crypto";
import { INDUSTRY_SCOUT_FEEDS, type IndustryScoutFeed } from "@/app/config/industryScoutFeeds";
import { ironscribeForensicIngest } from "@/app/services/ironscribe/forensicIngestor";
import { processIngestedRegulation } from "@/app/services/regulatoryPipeline";
import prisma from "@/lib/prisma";

const FETCH_TIMEOUT_MS = 15_000;
const USER_AGENT = "Ironframe-Ironsight-IndustryScout/1.0 (GRC; +https://ironframe.local)";

export type CrawlDiscoveredItem = {
  id: string;
  feedId: string;
  authority: string;
  title: string;
  link: string;
  description: string;
  publishedAt?: string;
  isPdf: boolean;
};

export type CrawlArtifact = {
  item: CrawlDiscoveredItem;
  localPath: string | null;
  buffer: Buffer | null;
  mimeType: string;
};

function parseRss(xml: string): Array<{
  title: string;
  description: string;
  link: string;
  pubDate?: string;
}> {
  const items: Array<{ title: string; description: string; link: string; pubDate?: string }> = [];
  const blocks = xml.split(/<item[\s>]/i).slice(1);
  for (const block of blocks.slice(0, 30)) {
    const title = block.match(/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i)?.[1]?.trim() ?? "";
    const description =
      block.match(/<description[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i)?.[1]?.trim() ?? "";
    const link = block.match(/<link[^>]*>([\s\S]*?)<\/link>/i)?.[1]?.trim() ?? "";
    const pubDate = block.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i)?.[1]?.trim();
    if (title && link) items.push({ title, description, link, pubDate });
  }
  return items;
}

function topicMatch(feed: IndustryScoutFeed, text: string): boolean {
  const lower = text.toLowerCase();
  return feed.topics.some((t) => lower.includes(t.toLowerCase()));
}

function stableItemId(feedId: string, link: string, title: string): string {
  return createHash("sha256").update(`${feedId}|${link}|${title}`, "utf8").digest("hex").slice(0, 16);
}

async function fetchFeed(feed: IndustryScoutFeed): Promise<CrawlDiscoveredItem[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(feed.url, {
      signal: controller.signal,
      headers: {
        Accept: "application/rss+xml, application/xml, text/xml",
        "User-Agent": USER_AGENT,
      },
      next: { revalidate: 0 },
    });
    if (!res.ok) return [];
    const xml = await res.text();
    return parseRss(xml)
      .map((item) => {
        const text = `${item.title} ${item.description}`;
        if (!topicMatch(feed, text)) return null;
        const link = item.link.trim();
        const isPdf = /\.pdf($|\?)/i.test(link);
        const discovered: CrawlDiscoveredItem = {
          id: stableItemId(feed.id, link, item.title),
          feedId: feed.id,
          authority: feed.authority,
          title: item.title.replace(/<[^>]+>/g, "").slice(0, 300),
          link,
          description: item.description.replace(/<[^>]+>/g, "").slice(0, 2000),
          isPdf: isPdf || (feed.pdfDiscovery && /final rule|amendment|sp\s*800/i.test(text)),
        };
        if (item.pubDate) discovered.publishedAt = item.pubDate;
        return discovered;
      })
      .filter((x): x is CrawlDiscoveredItem => x != null);
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

async function downloadArtifact(item: CrawlDiscoveredItem): Promise<CrawlArtifact> {
  try {
    const res = await fetch(item.link, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) {
      return { item, localPath: null, buffer: null, mimeType: "text/plain" };
    }
    const buf = Buffer.from(await res.arrayBuffer());
    const mimeType =
      res.headers.get("content-type")?.split(";")[0]?.trim() ??
      (item.isPdf ? "application/pdf" : "text/html");
    return { item, localPath: null, buffer: buf, mimeType };
  } catch {
    const fallback = Buffer.from(`${item.title}\n\n${item.description}`, "utf8");
    return {
      item,
      localPath: null,
      buffer: fallback,
      mimeType: "text/plain",
    };
  }
}

export type IndustryScoutRunResult = {
  ok: boolean;
  feedsPolled: number;
  discovered: number;
  newlyIngested: number;
  ingestedItemIds: string[];
  errors: string[];
};

const INDUSTRY_SCOUT_ARTIFACT_LOOKBACK_ROWS = 2000;

async function readIndustryScoutSeenIdsFromDb(tenantId: string): Promise<Set<string>> {
  const seen = new Set<string>();
  const prismaAny = prisma as any;
  const rows = await prismaAny.cronJobArtifact.findMany({
    where: {
      tenantId,
      agentName: "industry-scout",
    },
    select: {
      payloadJson: true,
    },
    orderBy: {
      runTimestamp: "desc",
    },
    take: INDUSTRY_SCOUT_ARTIFACT_LOOKBACK_ROWS,
  });

  for (const row of rows as Array<{ payloadJson?: unknown }>) {
    const payload = row.payloadJson;
    if (!payload || typeof payload !== "object") continue;
    const maybeItemIds = (payload as { ingestedItemIds?: unknown }).ingestedItemIds;
    if (!Array.isArray(maybeItemIds)) continue;
    for (const value of maybeItemIds) {
      if (typeof value === "string" && value.trim()) {
        seen.add(value.trim());
      }
    }
  }

  return seen;
}

/**
 * Ironsight Industry Scout — poll SEC / NIST CSRC / Colorado feeds, download rulings, hand to Ironscribe.
 */
export async function runIndustryScoutWorker(options?: {
  tenantId?: string;
}): Promise<IndustryScoutRunResult> {
  const tenantId = options?.tenantId?.trim();
  const seen = tenantId ? await readIndustryScoutSeenIdsFromDb(tenantId) : new Set<string>();
  const discovered: CrawlDiscoveredItem[] = [];
  const errors: string[] = [];
  const ingestedItemIds: string[] = [];
  let newlyIngested = 0;

  for (const feed of INDUSTRY_SCOUT_FEEDS) {
    const items = await fetchFeed(feed);
    discovered.push(...items);
  }

  for (const item of discovered) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);

    try {
      const artifact = await downloadArtifact(item);
      const buffer =
        artifact.buffer ??
        Buffer.from(`${item.title}\n\n${item.description}`, "utf8");
      const filename =
        artifact.localPath?.split(/[/\\]/).pop() ?? `${item.id}.txt`;

      const { blocks, sha256 } = await ironscribeForensicIngest({
        buffer,
        filename,
        mimeType: artifact.mimeType,
        authority: item.authority,
        sourceUrl: item.link,
      });

      await processIngestedRegulation({
        source: "ironsight_crawler",
        authority: item.authority,
        title: item.title,
        sourceUrl: item.link,
        localPath: artifact.localPath,
        sha256,
        mimeType: artifact.mimeType,
        blocks,
      });
      newlyIngested += 1;
      ingestedItemIds.push(item.id);
    } catch (e) {
      errors.push(`${item.id}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return {
    ok: true,
    feedsPolled: INDUSTRY_SCOUT_FEEDS.length,
    discovered: discovered.length,
    newlyIngested,
    ingestedItemIds,
    errors,
  };
}
