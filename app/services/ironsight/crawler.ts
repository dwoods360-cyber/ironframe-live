import "server-only";

import { createHash } from "crypto";
import { writeFileSync } from "fs";
import { join } from "path";
import { INDUSTRY_SCOUT_FEEDS, type IndustryScoutFeed } from "@/app/config/industryScoutFeeds";
import {
  ensureRegulatoryInboxDir,
  readIndustryScoutSeenIds,
  writeIndustryScoutSeenIds,
} from "@/app/lib/regulatoryIngestionState";
import { ironscribeForensicIngest } from "@/app/services/ironscribe/forensicIngestor";
import { processIngestedRegulation } from "@/app/services/regulatoryPipeline";

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
        return {
          id: stableItemId(feed.id, link, item.title),
          feedId: feed.id,
          authority: feed.authority,
          title: item.title.replace(/<[^>]+>/g, "").slice(0, 300),
          link,
          description: item.description.replace(/<[^>]+>/g, "").slice(0, 2000),
          publishedAt: item.pubDate,
          isPdf: isPdf || (feed.pdfDiscovery && /final rule|amendment|sp\s*800/i.test(text)),
        } satisfies CrawlDiscoveredItem;
      })
      .filter((x): x is CrawlDiscoveredItem => x != null);
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

async function downloadArtifact(item: CrawlDiscoveredItem): Promise<CrawlArtifact> {
  const inbox = ensureRegulatoryInboxDir();
  const ext = item.isPdf ? "pdf" : "html";
  const localPath = join(inbox, `${item.id}.${ext}`);

  try {
    const res = await fetch(item.link, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) {
      return { item, localPath: null, buffer: null, mimeType: "text/plain" };
    }
    const buf = Buffer.from(await res.arrayBuffer());
    writeFileSync(localPath, buf);
    const mimeType =
      res.headers.get("content-type")?.split(";")[0]?.trim() ??
      (item.isPdf ? "application/pdf" : "text/html");
    return { item, localPath, buffer: buf, mimeType };
  } catch {
    const fallback = Buffer.from(`${item.title}\n\n${item.description}`, "utf8");
    writeFileSync(localPath.replace(/\.[^.]+$/, ".txt"), fallback);
    return {
      item,
      localPath: localPath.replace(/\.[^.]+$/, ".txt"),
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
  errors: string[];
};

/**
 * Ironsight Industry Scout — poll SEC / NIST CSRC / Colorado feeds, download rulings, hand to Ironscribe.
 */
export async function runIndustryScoutWorker(): Promise<IndustryScoutRunResult> {
  const seen = readIndustryScoutSeenIds();
  const discovered: CrawlDiscoveredItem[] = [];
  const errors: string[] = [];
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
    } catch (e) {
      errors.push(`${item.id}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  writeIndustryScoutSeenIds(seen);

  return {
    ok: true,
    feedsPolled: INDUSTRY_SCOUT_FEEDS.length,
    discovered: discovered.length,
    newlyIngested,
    errors,
  };
}
