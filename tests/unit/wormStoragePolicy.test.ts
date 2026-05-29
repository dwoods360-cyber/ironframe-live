import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  assertStorageDeletePermitted,
  buildImmutableUploadOptions,
  EPIC_12_WORM_DELETE_BLOCK_MESSAGE,
  isWormProtectedStoragePath,
  parseStorageRef,
} from "@/app/lib/evidence/wormStoragePolicy";

describe("Epic 12 — WORM storage policy", () => {
  const priorLock = process.env.EVIDENCE_WORM_OBJECT_LOCK;

  beforeEach(() => {
    process.env.EVIDENCE_WORM_OBJECT_LOCK = "true";
  });

  afterEach(() => {
    if (priorLock === undefined) {
      delete process.env.EVIDENCE_WORM_OBJECT_LOCK;
    } else {
      process.env.EVIDENCE_WORM_OBJECT_LOCK = priorLock;
    }
  });

  it("parseStorageRef handles supabase and local refs", () => {
    expect(parseStorageRef("supabase://evidence-locker/tenant/a.pdf")).toEqual({
      kind: "supabase",
      bucket: "evidence-locker",
      objectPath: "tenant/a.pdf",
    });
    expect(parseStorageRef("uploads/evidence/tenant/file.bin")).toEqual({
      kind: "local",
      relative: "uploads/evidence/tenant/file.bin",
    });
  });

  it("detects WORM-protected prefixes", () => {
    expect(isWormProtectedStoragePath("supabase://evidence-locker/worm/global/report.md")).toBe(true);
    expect(isWormProtectedStoragePath("uploads/evidence/tenant/123.json")).toBe(true);
    expect(isWormProtectedStoragePath("storage/worm/post-mortems/pm.pdf")).toBe(true);
    expect(isWormProtectedStoragePath("uploads/tmp/draft.txt")).toBe(false);
  });

  it("blocks delete on WORM paths when enforcement is enabled", () => {
    const blocked = assertStorageDeletePermitted("storage/worm/post-mortems/pm.pdf");
    expect(blocked).toEqual({ ok: false, error: EPIC_12_WORM_DELETE_BLOCK_MESSAGE });
    expect(assertStorageDeletePermitted("uploads/tmp/draft.txt")).toEqual({ ok: true });
  });

  it("buildImmutableUploadOptions never allows upsert", () => {
    const opts = buildImmutableUploadOptions("application/pdf");
    expect(opts.upsert).toBe(false);
    expect(opts.cacheControl).toContain("immutable");
    expect(opts.contentType).toBe("application/pdf");
  });
});
