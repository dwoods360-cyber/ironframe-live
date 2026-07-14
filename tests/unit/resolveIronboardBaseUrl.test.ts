import { afterEach, describe, expect, it } from "vitest";

import { resolveIronboardBaseUrl } from "@/app/lib/conversationPlaneGateway";

const ENV_KEYS = [
  "OPERATIONS_IRONBOARD_URL",
  "IRONBOARD_URL",
  "NEXT_PUBLIC_IRONBOARD_URL",
  "IRONBOARD_CLOUD_RUN_URL",
  "VERCEL",
] as const;

const saved: Partial<Record<(typeof ENV_KEYS)[number], string | undefined>> = {};

afterEach(() => {
  for (const key of ENV_KEYS) {
    const value = saved[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

function snapshotEnv() {
  for (const key of ENV_KEYS) {
    saved[key] = process.env[key];
    delete process.env[key];
  }
}

describe("resolveIronboardBaseUrl", () => {
  it("uses an explicit public HTTPS upstream when set", () => {
    snapshotEnv();
    process.env.OPERATIONS_IRONBOARD_URL = "https://ironframe-ironboard.example.run.app/";
    expect(resolveIronboardBaseUrl()).toBe("https://ironframe-ironboard.example.run.app");
  });

  it("defaults to local loopback outside Vercel", () => {
    snapshotEnv();
    expect(resolveIronboardBaseUrl()).toBe("http://127.0.0.1:8082");
  });

  it("rejects empty/loopback env on Vercel and falls back to Cloud Run", () => {
    snapshotEnv();
    process.env.VERCEL = "1";
    process.env.OPERATIONS_IRONBOARD_URL = "";
    expect(resolveIronboardBaseUrl()).toBe(
      "https://ironframe-ironboard-4qpposvc7q-uc.a.run.app",
    );

    process.env.OPERATIONS_IRONBOARD_URL = "http://127.0.0.1:8082";
    expect(resolveIronboardBaseUrl()).toBe(
      "https://ironframe-ironboard-4qpposvc7q-uc.a.run.app",
    );
  });

  it("honors IRONBOARD_CLOUD_RUN_URL override on Vercel", () => {
    snapshotEnv();
    process.env.VERCEL = "1";
    process.env.IRONBOARD_CLOUD_RUN_URL = "https://ironboard-override.example.run.app/";
    expect(resolveIronboardBaseUrl()).toBe("https://ironboard-override.example.run.app");
  });
});
