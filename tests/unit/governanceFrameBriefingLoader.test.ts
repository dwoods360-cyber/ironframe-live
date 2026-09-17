import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  fetchBriefingBySlug,
  fetchPublishedBriefings,
  mapPublishedBriefingRecord,
} from "@/app/lib/governanceFrame/briefingLoader";

const { findMany, findFirst } = vi.hoisted(() => ({
  findMany: vi.fn(),
  findFirst: vi.fn(),
}));

vi.mock("@/app/lib/server/ironguardSessionTenant", () => ({
  withIronguardTenant: vi.fn(
    async (
      _tenantId: string,
      run: (tx: { publishedBriefing: { findMany: typeof findMany; findFirst: typeof findFirst } }) => unknown,
    ) =>
      run({
        publishedBriefing: {
          findMany,
          findFirst,
        },
      }),
  ),
}));

vi.mock("@/app/lib/governanceFrame/briefingFilesystemLedger", () => ({
  BRIEFING_QUEUE_DIR: "queue",
  PUBLISHED_BRIEFINGS_DIR: "published",
  QUARANTINE_ALLOWLIST: [],
  enforceBriefingQuarantine: vi.fn(),
  loadBriefingBySlugFromFilesystem: vi.fn(),
  loadPublishedBriefingsFromFilesystem: vi.fn(() => []),
  resolveDocsRoot: () => "/tmp",
}));

vi.mock("@/app/utils/serverTenantContext", () => ({
  getScopedTenantUuidFromCookies: vi.fn(async () => null),
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
    findMany.mockReset();
    findFirst.mockReset();
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

  it("fetchPublishedBriefings queries ascending createdAt for the bound tenant", async () => {
    findMany.mockResolvedValue([SAMPLE_RECORD]);

    const briefings = await fetchPublishedBriefings(SAMPLE_RECORD.tenantId);

    expect(findMany).toHaveBeenCalledWith({
      where: { tenantId: SAMPLE_RECORD.tenantId },
      orderBy: { createdAt: "asc" },
    });
    expect(briefings).toHaveLength(1);
    expect(briefings[0]?.slug).toBe("medshield-sec-update-01");
  });

  it("fetchBriefingBySlug normalizes slug and returns null for path traversal", async () => {
    findFirst.mockResolvedValue(SAMPLE_RECORD);

    const hit = await fetchBriefingBySlug("Medshield-Sec-Update-01", SAMPLE_RECORD.tenantId);
    expect(findFirst).toHaveBeenCalledWith({
      where: { slug: "medshield-sec-update-01", tenantId: SAMPLE_RECORD.tenantId },
    });
    expect(hit?.title).toBe("Medshield Governance Review");

    expect(await fetchBriefingBySlug("../escape", SAMPLE_RECORD.tenantId)).toBeNull();
    expect(findFirst).toHaveBeenCalledTimes(1);
  });
});
