import { describe, expect, it } from "vitest";
import {
  assertWebhookUrlPassesIrongate,
  IrongateOutboundWebhookError,
} from "@/lib/security/irongateOutboundWebhook";

describe("irongate outbound webhook (Agent 14)", () => {
  it("allows Slack incoming webhook host", () => {
    const u = assertWebhookUrlPassesIrongate("https://hooks.slack.com/services/T000/B000/secret");
    expect(u.hostname).toBe("hooks.slack.com");
  });

  it("rejects http", () => {
    expect(() => assertWebhookUrlPassesIrongate("http://hooks.slack.com/services/x")).toThrow(
      IrongateOutboundWebhookError,
    );
  });

  it("rejects localhost", () => {
    expect(() => assertWebhookUrlPassesIrongate("https://localhost/hook")).toThrow(IrongateOutboundWebhookError);
  });

  it("rejects private IPv4 literal hostnames", () => {
    expect(() => assertWebhookUrlPassesIrongate("https://10.0.0.1/x")).toThrow(IrongateOutboundWebhookError);
  });

  it("rejects unknown SaaS hosts", () => {
    expect(() => assertWebhookUrlPassesIrongate("https://evil.example/webhook")).toThrow(IrongateOutboundWebhookError);
  });
});
