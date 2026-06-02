import { describe, it, expect, afterEach } from "vitest";
import {
  assertEpic15DatabaseUrlLock,
  Epic15DatabaseConfigError,
} from "@/src/services/orchestration/checkpointer";

describe("Epic 15 — DATABASE_URL CI lock", () => {
  const priorUrl = process.env.DATABASE_URL;
  const priorCi = process.env.CI;

  afterEach(() => {
    if (priorUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = priorUrl;
    if (priorCi === undefined) delete process.env.CI;
    else process.env.CI = priorCi;
  });

  it("throws when DATABASE_URL is unset", () => {
    delete process.env.DATABASE_URL;
    expect(() => assertEpic15DatabaseUrlLock()).toThrow(Epic15DatabaseConfigError);
  });

  it("blocks remote Supabase URLs in CI", () => {
    process.env.CI = "true";
    process.env.DATABASE_URL = "postgresql://user:pass@db.abc.supabase.co:5432/postgres";
    expect(() => assertEpic15DatabaseUrlLock()).toThrow(/ephemeral Postgres/i);
  });

  it("allows local ephemeral Postgres in CI", () => {
    process.env.CI = "true";
    process.env.DATABASE_URL = "postgresql://postgres:postgres_password@127.0.0.1:5432/ironframe_test";
    expect(() => assertEpic15DatabaseUrlLock()).not.toThrow();
  });
});
