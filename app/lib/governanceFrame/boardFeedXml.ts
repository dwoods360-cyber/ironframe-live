export type BriefingFeedItem = {
  id: string;
  title: string;
  content: string;
  exposureCents: bigint;
  createdAt: Date;
};

export function formatBriefingExposureUsd(exposureCents: bigint): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number(exposureCents) / 100);
}

export function buildBoardFeedRssXml(items: BriefingFeedItem[]): string {
  let rssItems = "";

  for (const item of items) {
    const formattedUSD = formatBriefingExposureUsd(item.exposureCents);
    rssItems += `
        <item>
          <title><![CDATA[${item.title} - ${formattedUSD} Risk Exposure]]></title>
          <description><![CDATA[${item.content}]]></description>
          <pubDate>${item.createdAt.toUTCString()}</pubDate>
          <guid isPermaLink="false">${item.id}</guid>
        </item>
      `;
  }

  return `<?xml version="1.0" encoding="UTF-8" ?>
      <rss version="2.0">
        <channel>
          <title>Ironframe Governance Analytics Feed</title>
          <link>https://research.ironframegrc.com</link>
          <description>Courtroom-grade production telemetry logs matching DORA Pillar 5 compliance.</description>
          <language>en-us</language>
          ${rssItems}
        </channel>
      </rss>
    `;
}
