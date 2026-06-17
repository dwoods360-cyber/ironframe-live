import { describe, expect, it, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

import { checkBoardFeedAuth } from "@/app/api/internal/cron/cronAuth";
import {
  buildBoardFeedRssXml,
  formatBriefingExposureUsd,
} from "@/app/lib/governanceFrame/boardFeedXml";
import {
  parseBriefingDraftFrontmatter,
  stripFrontmatter,
} from "@/app/lib/governanceFrame/briefingDraftValidation";
import * as FeedRoute from "@/app/api/board/feed/route";
import prisma from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  default: {
    publishedBriefing: {
      findMany: vi.fn(),
    },
  },
}));

const SAMPLE_FRONTMATTER = `---
title: "Medshield Governance Review"
date: "2026-06-17T03:00:00.000Z"
status: "QUARANTINED_DRAFT"
tenantId: "5c420f5a-8f1f-4bbf-b42d-7f8dd4bb6a01"
tenantSlug: "medshield"
requiresImmediatePromotion: true
activeExposureCents: "9650000"
doraScore: "100"
---

### I. Exposure Vector
Perimeter review.
`;

describe("parseBriefingDraftFrontmatter", () => {
  it("parses tenant, exposure cents as BigInt, and dora score", () => {
    const parsed = parseBriefingDraftFrontmatter(SAMPLE_FRONTMATTER, "fallback");
    expect(parsed).not.toBeNull();
    expect(parsed?.tenantId).toBe("5c420f5a-8f1f-4bbf-b42d-7f8dd4bb6a01");
    expect(parsed?.activeExposureCents).toBe(9_650_000n);
    expect(parsed?.doraScore).toBe(100);
    expect(parsed?.title).toBe("Medshield Governance Review");
  });

  it("returns null when tenantId is missing", () => {
    const body = SAMPLE_FRONTMATTER.replace(/^tenantId:.*$/m, "");
    expect(parseBriefingDraftFrontmatter(body, "fallback")).toBeNull();
  });

  it("strips frontmatter for promotion body", () => {
    const body = stripFrontmatter(SAMPLE_FRONTMATTER);
    expect(body).toMatch(/^### I\. Exposure Vector/);
    expect(body).not.toMatch(/^---/);
  });
});

describe("boardFeedXml", () => {
  it("formats exposure in USD without float cents", () => {
    expect(formatBriefingExposureUsd(9_650_000n)).toBe("$96,500.00");
  });

  it("builds RSS channel with item guid and title", () => {
    const xml = buildBoardFeedRssXml([
      {
        id: "brief-1",
        title: "Medshield Review",
        content: "### Exposure",
        exposureCents: 9_650_000n,
        createdAt: new Date("2026-06-17T12:00:00.000Z"),
      },
    ]);
    expect(xml).toContain("<rss version=\"2.0\">");
    expect(xml).toContain("Medshield Review - $96,500.00 Risk Exposure");
    expect(xml).toContain("<guid isPermaLink=\"false\">brief-1</guid>");
  });
});

describe("checkBoardFeedAuth", () => {
  beforeEach(() => {
    process.env.IRONFRAME_CRON_SECRET = "test-cron-secret";
  });

  it("accepts syndication secret query param", () => {
    const req = new NextRequest("http://localhost:3000/api/board/feed?secret=test-cron-secret");
    expect(checkBoardFeedAuth(req)).toBe(true);
  });

  it("rejects missing or wrong secret", () => {
    expect(checkBoardFeedAuth(new NextRequest("http://localhost:3000/api/board/feed"))).toBe(false);
    expect(
      checkBoardFeedAuth(new NextRequest("http://localhost:3000/api/board/feed?secret=wrong")),
    ).toBe(false);
  });
});

describe("GET /api/board/feed", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.IRONFRAME_CRON_SECRET = "test-cron-secret";
    vi.mocked(prisma.publishedBriefing.findMany).mockReset();
  });

  it("returns 401 without auth", async () => {
    const res = await FeedRoute.GET(new Request("http://localhost:3000/api/board/feed"));
    expect(res.status).toBe(401);
  });

  it("returns XML from database rows", async () => {
    vi.mocked(prisma.publishedBriefing.findMany).mockResolvedValue([
      {
        id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        tenantId: "5c420f5a-8f1f-4bbf-b42d-7f8dd4bb6a01",
        slug: "medshield-sec-update-01",
        title: "Medshield SEC Update",
        content: "### I. Exposure Vector",
        exposureCents: 9_650_000n,
        doraScore: 100,
        publishedBy: "dereck@corp",
        createdAt: new Date("2026-06-17T12:00:00.000Z"),
      },
    ]);

    const res = await FeedRoute.GET(
      new Request("http://localhost:3000/api/board/feed?secret=test-cron-secret"),
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("application/xml");
    const body = await res.text();
    expect(body).toContain("Medshield SEC Update - $96,500.00 Risk Exposure");
    expect(prisma.publishedBriefing.findMany).toHaveBeenCalledWith({
      where: undefined,
      orderBy: { createdAt: "desc" },
      take: 20,
    });
  });

  it("scopes feed by tenantId when provided", async () => {
    vi.mocked(prisma.publishedBriefing.findMany).mockResolvedValue([]);

    await FeedRoute.GET(
      new Request(
        "http://localhost:3000/api/board/feed?secret=test-cron-secret&tenantId=5c420f5a-8f1f-4bbf-b42d-7f8dd4bb6a01",
      ),
    );

    expect(prisma.publishedBriefing.findMany).toHaveBeenCalledWith({
      where: { tenantId: "5c420f5a-8f1f-4bbf-b42d-7f8dd4bb6a01" },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
  });
});
