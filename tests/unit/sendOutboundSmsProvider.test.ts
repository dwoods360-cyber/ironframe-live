import { afterEach, describe, expect, it } from "vitest";

import { resolveSmsProvider } from "@/app/lib/server/sendOutboundSms";

describe("resolveSmsProvider", () => {
  const keys = [
    "SMS_PROVIDER",
    "TEXTBELT_API_KEY",
    "TWILIO_ACCOUNT_SID",
    "TWILIO_AUTH_TOKEN",
  ] as const;
  const original: Record<string, string | undefined> = {};

  afterEach(() => {
    for (const key of keys) {
      if (original[key] === undefined) delete process.env[key];
      else process.env[key] = original[key];
    }
  });

  function snapshot() {
    for (const key of keys) original[key] = process.env[key];
  }

  it("returns null when nothing is configured", () => {
    snapshot();
    for (const key of keys) delete process.env[key];
    expect(resolveSmsProvider()).toBeNull();
  });

  it("prefers Textbelt when TEXTBELT_API_KEY is set", () => {
    snapshot();
    for (const key of keys) delete process.env[key];
    process.env.TEXTBELT_API_KEY = "tb_test_key";
    expect(resolveSmsProvider()).toBe("textbelt");
  });

  it("honors explicit SMS_PROVIDER=twilio", () => {
    snapshot();
    for (const key of keys) delete process.env[key];
    process.env.SMS_PROVIDER = "twilio";
    process.env.TEXTBELT_API_KEY = "tb_test_key";
    expect(resolveSmsProvider()).toBe("twilio");
  });
});
