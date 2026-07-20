import { beforeEach, describe, expect, it, vi } from "vitest";

const listAppDocumentsForNavigation = vi.fn();

vi.mock("@/app/lib/server/appDocumentStore", () => ({
  listAppDocumentsForNavigation: (...args: unknown[]) => listAppDocumentsForNavigation(...args),
  dbKeyToSlugSegments: (dbKey: string) =>
    dbKey === "readme" ? ["README"] : dbKey.split("/"),
}));

describe("buildAppDocsNavigation", () => {
  beforeEach(() => {
    listAppDocumentsForNavigation.mockReset();
  });

  it("builds nav from a single lightweight query (no per-slug body fetch)", async () => {
    listAppDocumentsForNavigation.mockResolvedValue([
      { slug: "readme", title: "Docs README", readingLevel: "LEVEL_1" },
      {
        slug: "user-manuals/design-partner-operator-packet",
        title: "Operator Packet",
        readingLevel: "LEVEL_1",
      },
      {
        slug: "training/level1-partner-index",
        title: "Partner Index",
        readingLevel: "TRAINING",
      },
    ]);

    const { buildAppDocsNavigation, groupAppDocsNavigation } = await import(
      "@/app/lib/server/appDocsNavigation"
    );

    const items = await buildAppDocsNavigation();
    expect(listAppDocumentsForNavigation).toHaveBeenCalledTimes(1);
    expect(items.map((i) => i.href)).toEqual([
      "/docs/README",
      "/docs/user-manuals/design-partner-operator-packet",
      "/docs/training/level1-partner-index",
    ]);

    const sections = await groupAppDocsNavigation(items);
    expect(sections.map((s) => s.key)).toEqual(["root-hub", "user-manuals", "training"]);
  });
});
