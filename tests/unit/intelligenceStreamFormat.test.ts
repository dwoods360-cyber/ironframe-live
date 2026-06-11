import { describe, expect, it } from "vitest";
import {
  formatAgentIntelLine,
  formatIntelStreamLine,
} from "@/app/utils/intelligenceStreamFormat";

describe("intelligenceStreamFormat", () => {
  it("prepends timestamp when missing", () => {
    const at = new Date("2026-06-07T15:04:05.000Z");
    const line = formatIntelStreamLine("> [IRONTECH] Stage 1/3 — engaged", at);
    expect(line).toMatch(/^> \[\d{2}:\d{2}:\d{2}\] \[IRONTECH\]/);
  });

  it("does not double-stamp lines that already include a timestamp", () => {
    const line = formatIntelStreamLine("> [14:22:01] [AGENT-14:IRONGATE] ingress", new Date());
    expect(line).toBe("> [14:22:01] [AGENT-14:IRONGATE] ingress");
  });

  it("formats agent operational lines with codename", () => {
    const at = new Date("2026-06-07T15:04:05.000Z");
    const line = formatAgentIntelLine("AGENT-04", "IRONSIGHT", "Deep-dive closed.", at);
    expect(line).toMatch(/^> \[\d{2}:\d{2}:\d{2}\] \[AGENT-04:IRONSIGHT\] Deep-dive closed\.$/);
  });
});
