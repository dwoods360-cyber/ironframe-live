import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  assertEpic12WormStorageConfig,
  assertStorageDeletePermitted,
  assertStorageOverwritePermitted,
  buildImmutableUploadOptions,
  EPIC_12_WORM_DELETE_BLOCK_MESSAGE,
  isAllowedWormUploadObjectPath,
  isWormProtectedStoragePath,
  parseStorageRef,
  resolveEpic12StorageConfig,
  WormStorageConfigError,
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

  it("validates WORM upload root prefixes", () => {
    expect(isAllowedWormUploadObjectPath("worm/tenant/file.pdf")).toBe(true);
    expect(isAllowedWormUploadObjectPath("financial/ledger/tx-001.json")).toBe(true);
    expect(isAllowedWormUploadObjectPath("forensic/dump/host-01.bin")).toBe(true);
    expect(isAllowedWormUploadObjectPath("uploads/tmp/draft.txt")).toBe(false);
  });

  it("blocks overwrite on WORM paths symmetrically with delete", () => {
    const path = "supabase://evidence-locker/financial/tenant/ledger.json";
    expect(assertStorageOverwritePermitted(path)).toEqual({
      ok: false,
      error: EPIC_12_WORM_DELETE_BLOCK_MESSAGE,
    });
  });

  it("resolveEpic12StorageConfig reflects env defaults", () => {
    const cfg = resolveEpic12StorageConfig();
    expect(cfg.evidenceBucket).toBe("evidence-locker");
    expect(cfg.wormBucket).toBe("evidence-locker-worm");
    expect(cfg.objectLockEnabled).toBe(true);
  });

  it("assertEpic12WormStorageConfig throws in strict mode when lock disabled", () => {
    const priorNode = process.env.NODE_ENV;
    const priorLock = process.env.EVIDENCE_WORM_OBJECT_LOCK;
    process.env.NODE_ENV = "production";
    process.env.EVIDENCE_WORM_OBJECT_LOCK = "false";
    expect(() => assertEpic12WormStorageConfig()).toThrow(WormStorageConfigError);
    process.env.NODE_ENV = priorNode;
    process.env.EVIDENCE_WORM_OBJECT_LOCK = priorLock ?? "true";
  });
});
