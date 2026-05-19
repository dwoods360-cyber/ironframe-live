import "server-only";

import { auditLogCreateLoose } from "@/lib/auditLogLoose";
import {
  mergeDriftAlerts,
  readComplianceDriftState,
  writeComplianceDriftState,
} from "@/app/lib/complianceDriftState";
import {
  analyzeRegulatoryBatch,
  type RegulatoryFeedItem,
} from "@/app/services/irontallyGapAnalysis";
import { buildMinnesotaBpsComplianceAlerts } from "@/app/services/ironsight/minnesotaBpsAlerts";

export type IronsightFeedConfig = {
  id: string;
  name: string;
  url: string;
  authority: string;
};

/** Authoritative regulatory RSS endpoints (best-effort; offline seeds apply). */
export const IRONSIGHT_REGULATORY_FEEDS: readonly IronsightFeedConfig[] = [
  {
    id: "sec",
    name: "SEC.gov Press Releases",
    url: "https://www.sec.gov/news/pressreleases.rss",
    authority: "SEC",
  },
  {
    id: "nist",
    name: "NIST Cybersecurity News",
    url: "https://www.nist.gov/news-events/cybersecurity/rss.xml",
    authority: "NIST",
  },
  {
    id: "iso",
    name: "ISO.org News",
    url: "https://www.iso.org/contents/data/standard/rss/news.xml",
    authority: "ISO",
  },
  {
    id: "colorado",
    name: "Colorado.gov — SB24-205 AI",
    url: "https://www.colorado.gov/governor/news/rss.xml",
    authority: "Colorado",
  },
] as const;

const POLL_TIMEOUT_MS = 12_000;

/** Curated signals when RSS fetch fails (constitutional drift drill seeds). */
const IRONSIGHT_REGULATORY_SEEDS: RegulatoryFeedItem[] = [
  {
    source: "SEC.gov",
    sourceUrl: "https://www.sec.gov/",
    title: "SEC Reg S-P amendments — 30-day breach notification for covered institutions",
    description:
      "Amendments to Regulation S-P require covered entities to notify affected individuals within 30 days of discovering a breach. Effective June 2026.",
    publishedAt: new Date().toISOString(),
    link: "https://www.sec.gov/rules/final/2024/reg-sp-amendments",
  },
  {
    source: "Colorado.gov",
    sourceUrl: "https://www.colorado.gov/",
    title: "SB24-205 Colorado AI Act — high-risk AI governance and disclosure",
    description:
      "Colorado SB24-205 establishes AI governance obligations including tenant isolation reviews and algorithmic accountability for high-risk systems.",
    publishedAt: new Date().toISOString(),
    link: "https://www.colorado.gov/sb24-205",
  },
  {
    source: "NIST.gov",
    sourceUrl: "https://www.nist.gov/",
    title: "NIST CSF 2.0 — incident response and tenant isolation profile updates",
    description:
      "NIST Cybersecurity Framework 2.0 emphasizes multi-tenant isolation and incident response playbooks for financial sector entities.",
    publishedAt: new Date().toISOString(),
    link: "https://www.nist.gov/cyberframework",
  },
];

function parseRssItems(xml: string): Array<{ title: string; description: string; link: string; pubDate?: string }> {
  const items: Array<{ title: string; description: string; link: string; pubDate?: string }> = [];
  const blocks = xml.split(/<item[\s>]/i).slice(1);
  for (const block of blocks.slice(0, 25)) {
    const title = block.match(/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i)?.[1]?.trim() ?? "";
    const description =
      block.match(/<description[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i)?.[1]?.trim() ?? "";
    const link = block.match(/<link[^>]*>([\s\S]*?)<\/link>/i)?.[1]?.trim() ?? "";
    const pubDate = block.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i)?.[1]?.trim();
    if (title) items.push({ title, description, link, pubDate });
  }
  return items;
}

async function fetchFeedItems(feed: IronsightFeedConfig): Promise<RegulatoryFeedItem[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), POLL_TIMEOUT_MS);
  try {
    const res = await fetch(feed.url, {
      signal: controller.signal,
      headers: { Accept: "application/rss+xml, application/xml, text/xml" },
      next: { revalidate: 0 },
    });
    if (!res.ok) return [];
    const xml = await res.text();
    return parseRssItems(xml).map((item) => ({
      source: feed.name,
      sourceUrl: feed.url,
      title: item.title.replace(/<[^>]+>/g, ""),
      description: item.description.replace(/<[^>]+>/g, "").slice(0, 2000),
      link: item.link,
      publishedAt: item.pubDate,
    }));
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

export type IronsightPollResult = {
  ok: boolean;
  itemsScanned: number;
  keywordsMatched: number;
  newAlerts: number;
  sourcesPolled: number;
  usedSeeds: boolean;
};

/**
 * Ironsight (Agent 4 / tactical sentinel plane) — poll external regulatory feeds and hand off to Irontally.
 */
export async function runIronsightRegulatoryPoll(): Promise<IronsightPollResult> {
  const prev = await readComplianceDriftState();
  const collected: RegulatoryFeedItem[] = [];
  let sourcesPolled = 0;

  for (const feed of IRONSIGHT_REGULATORY_FEEDS) {
    const items = await fetchFeedItems(feed);
    sourcesPolled += 1;
    collected.push(...items);
  }

  const usedSeeds = collected.length === 0;
  if (usedSeeds) {
    collected.push(...IRONSIGHT_REGULATORY_SEEDS);
    sourcesPolled = IRONSIGHT_REGULATORY_SEEDS.length;
  }

  const batchAlerts = analyzeRegulatoryBatch(collected);
  const mnBpsAlerts = buildMinnesotaBpsComplianceAlerts();
  const newAlerts = [...batchAlerts, ...mnBpsAlerts];
  const merged = mergeDriftAlerts(prev.alerts, newAlerts);

  const keywordsMatched = collected.reduce((acc, item) => {
    const text = `${item.title} ${item.description}`.toLowerCase();
    return acc + (text.includes("breach") || text.includes("tenant") || text.includes("ai ") ? 1 : 0);
  }, 0) + mnBpsAlerts.length;

  await writeComplianceDriftState({
    ...prev,
    lastPollAt: new Date().toISOString(),
    alerts: merged,
    pollStats: {
      sourcesPolled,
      itemsScanned: collected.length,
      keywordsMatched,
      newAlerts: newAlerts.length,
    },
  });

  try {
    await auditLogCreateLoose({
      data: {
        action: "IRONSIGHT_REGULATORY_POLL",
        justification: JSON.stringify({
          sourcesPolled,
          itemsScanned: collected.length,
          newAlerts: newAlerts.length,
          usedSeeds,
          operator: "IRONSIGHT_AGENT_4",
        }),
        operatorId: "IRONSIGHT_AGENT_4",
        threatId: null,
        isSimulation: false,
      },
    });
  } catch {
    /* best-effort */
  }

  return {
    ok: true,
    itemsScanned: collected.length,
    keywordsMatched,
    newAlerts: newAlerts.length,
    sourcesPolled,
    usedSeeds,
  };
}
