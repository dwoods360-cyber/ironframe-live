import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  fetchBriefingBySlug,
  fetchPublishedBriefings,
  mapPublishedBriefingRecord,
} from "@/app/lib/governanceFrame/briefingLoader";
import prisma from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  default: {
    publishedBriefing: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}));

const SAMPLE_RECORD = {
  id: "47755d12-61ba-4399-8793-5a3ad3ea6f00",
  tenantId: "5c420f5a-8f1f-4bbf-b42d-7f8dd4bb6a01",
  slug: "medshield-sec-update-01",
  title: "Medshield Governance Review",
  content: "### I. Exposure Vector\nPerimeter review.",
  exposureCents: 9_650_000n,
  doraScore: 100,
  publishedBy: "j.doe@corp.example",
  createdAt: new Date("2026-06-17T03:00:00.000Z"),
};

describe("governanceFrame briefingLoader (Postgres ledger)", () => {
  beforeEach(() => {
    vi.mocked(prisma.publishedBriefing.findMany).mockReset();
    vi.mocked(prisma.publishedBriefing.findUnique).mockReset();
  });

  it("maps Prisma rows to GovernanceBriefing view models", () => {
    const briefing = mapPublishedBriefingRecord(SAMPLE_RECORD);
    expect(briefing.slug).toBe("medshield-sec-update-01");
    expect(briefing.title).toBe("Medshield Governance Review");
    expect(briefing.author).toBe("j.doe@corp.example");
    expect(briefing.publishedAt).toBe("2026-06-17T03:00:00.000Z");
    expect(briefing.markdown).toContain("Exposure Vector");
    expect(briefing.sortKey).toBe(SAMPLE_RECORD.createdAt.getTime());
  });

  it("fetchPublishedBriefings queries ascending createdAt", async () => {
    vi.mocked(prisma.publishedBriefing.findMany).mockResolvedValue([SAMPLE_RECORD]);

    const briefings = await fetchPublishedBriefings();

    expect(prisma.publishedBriefing.findMany).toHaveBeenCalledWith({
      orderBy: { createdAt: "asc" },
    });
    expect(briefings).toHaveLength(1);
    expect(briefings[0]?.slug).toBe("medshield-sec-update-01");
  });

  it("fetchBriefingBySlug normalizes slug and returns null for path traversal", async () => {
    vi.mocked(prisma.publishedBriefing.findUnique).mockResolvedValue(SAMPLE_RECORD);

    const hit = await fetchBriefingBySlug("Medshield-Sec-Update-01");
    expect(prisma.publishedBriefing.findUnique).toHaveBeenCalledWith({
      where: { slug: "medshield-sec-update-01" },
    });
    expect(hit?.title).toBe("Medshield Governance Review");

    expect(await fetchBriefingBySlug("../escape")).toBeNull();
    expect(prisma.publishedBriefing.findUnique).toHaveBeenCalledTimes(1);
  });
});
