import { describe, it, expect, vi, beforeEach } from "vitest";

const uploadMock = vi.fn();
const removeMock = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    storage: {
      from: vi.fn(() => ({
        upload: uploadMock,
        remove: removeMock,
      })),
    },
  })),
}));

import {
  removeStorageObjectIfPermitted,
  uploadImmutableWormObject,
} from "@/app/lib/evidence/supabaseWormStorage";
import { EPIC_12_WORM_DELETE_BLOCK_MESSAGE } from "@/app/lib/evidence/wormStoragePolicy";

describe("supabaseWormStorage — Epic 12 gates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.EVIDENCE_WORM_OBJECT_LOCK = "true";
    uploadMock.mockResolvedValue({ error: null });
    removeMock.mockResolvedValue({ error: null });
  });

  it("rejects uploads outside approved WORM prefixes", async () => {
    const result = await uploadImmutableWormObject({
      objectPath: "tmp/draft.pdf",
      bytes: new Uint8Array([1, 2, 3]),
      mimeType: "application/pdf",
    });
    expect(result.ok).toBe(false);
    expect(uploadMock).not.toHaveBeenCalled();
  });

  it("uploads immutable objects under worm/ prefix", async () => {
    const bytes = new Uint8Array([9, 9, 9]);
    const result = await uploadImmutableWormObject({
      objectPath: "worm/tenant-1/report.pdf",
      bytes,
      mimeType: "application/pdf",
      tenantId: "tenant-1",
    });
    expect(result.ok).toBe(true);
    expect(uploadMock).toHaveBeenCalledWith(
      "worm/tenant-1/report.pdf",
      bytes,
      expect.objectContaining({ upsert: false }),
    );
  });

  it("blocks remove on WORM sealed refs", async () => {
    const result = await removeStorageObjectIfPermitted(
      "supabase://evidence-locker/worm/tenant/sealed.pdf",
    );
    expect(result.blocked).toBe(true);
    expect(result.removed).toBe(false);
    expect(result.error).toBe(EPIC_12_WORM_DELETE_BLOCK_MESSAGE);
    expect(removeMock).not.toHaveBeenCalled();
  });
});
