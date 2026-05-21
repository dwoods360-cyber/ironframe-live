import { createHash } from "crypto";
import { afterEach, describe, expect, it } from "vitest";
import { existsSync, unlinkSync } from "fs";
import { join } from "path";

import {
  isNuclearOverrideKeyExhausted,
  markNuclearOverrideKeySpent,
  readNuclearOverrideState,
} from "@/app/lib/constitutionalNuclearOverrideState";
import { verifyConstitutionalOverrideKey } from "@/app/utils/constitutionalOverrideVerify";

const TEST_HEX = "a".repeat(64);
const TEST_MASTER_SHA = createHash("sha256").update(TEST_HEX, "utf8").digest("hex");

const STATE_FILE = join(process.cwd(), "storage", "constitutional", "nuclear-override-state.json");
const META_FILE = join(process.cwd(), "storage", "constitutional", "emergency-seal-meta.json");

describe("verifyConstitutionalOverrideKey", () => {
  afterEach(() => {
    delete process.env.CONSTITUTION_OVERRIDE_SECRET;
    if (existsSync(STATE_FILE)) unlinkSync(STATE_FILE);
    if (existsSync(META_FILE)) unlinkSync(META_FILE);
  });

  it("accepts matching 64-char hex secret", async () => {
    process.env.CONSTITUTION_OVERRIDE_SECRET = TEST_HEX;
    const result = await verifyConstitutionalOverrideKey(TEST_HEX);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.masterSha256).toBe(TEST_MASTER_SHA);

    const upper = await verifyConstitutionalOverrideKey(TEST_HEX.toUpperCase());
    expect(upper.ok).toBe(true);
  });

  it("rejects key after nuclear override spent", async () => {
    process.env.CONSTITUTION_OVERRIDE_SECRET = TEST_HEX;
    markNuclearOverrideKeySpent("SYSTEM_OWNER", TEST_MASTER_SHA);
    expect(isNuclearOverrideKeyExhausted(TEST_MASTER_SHA)).toBe(true);
    const result = await verifyConstitutionalOverrideKey(TEST_HEX);
    expect(result.ok).toBe(false);
    expect(readNuclearOverrideState().isOverrideSpent).toBe(true);
  });

  it("rejects wrong length or missing secret", async () => {
    process.env.CONSTITUTION_OVERRIDE_SECRET = TEST_HEX;
    expect((await verifyConstitutionalOverrideKey("abc")).ok).toBe(false);
    expect((await verifyConstitutionalOverrideKey(undefined)).ok).toBe(false);
    delete process.env.CONSTITUTION_OVERRIDE_SECRET;
    expect((await verifyConstitutionalOverrideKey(TEST_HEX)).ok).toBe(false);
  });
});
