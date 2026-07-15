import { describe, expect, it } from "vitest";

import {
  prepareOpsWorkerSpeechText,
  synthesisPitch,
  synthesisRate,
  workerToBoardAgentRole,
} from "@/app/lib/operations/opsWorkerSpeech";

describe("prepareOpsWorkerSpeechText (Ironboard parity)", () => {
  it("strips markdown markers like Ironboard prepareSpeechText", () => {
    const out = prepareOpsWorkerSpeechText(
      "Next step: harvest.\n```ts\nconst x = 1;\n```\n**Bold** and `code`.md",
    );
    expect(out).toMatch(/Next step/);
    expect(out).toMatch(/const x/); // Ironboard keeps fence body; only removes fence ticks
    expect(out).not.toMatch(/\*\*/);
    expect(out).not.toMatch(/\.md/);
    expect(out).toMatch(/Bold and code/);
  });

  it("truncates long replies near a sentence boundary", () => {
    const long = `${"Sentence one. ".repeat(80)}Trailing without period`;
    const out = prepareOpsWorkerSpeechText(long);
    expect(out.length).toBeLessThanOrEqual(721);
    expect(out.endsWith(".")).toBe(true);
  });
});

describe("Ironboard synthesis clamps", () => {
  it("maps every worker to the shared CEO voice path", () => {
    expect(workerToBoardAgentRole("ironboard")).toBe("CEO");
    expect(workerToBoardAgentRole("salesteam")).toBe("CEO");
    expect(workerToBoardAgentRole("ironleads")).toBe("CEO");
    expect(workerToBoardAgentRole("success-team")).toBe("CEO");
    expect(workerToBoardAgentRole("support-team")).toBe("CEO");
  });

  it("exposes synthesisRate/Pitch in Ironboard ranges", () => {
    expect(synthesisRate()).toBeGreaterThanOrEqual(0.75);
    expect(synthesisRate()).toBeLessThanOrEqual(1.25);
    expect(synthesisPitch()).toBeGreaterThanOrEqual(0.85);
    expect(synthesisPitch()).toBeLessThanOrEqual(1.15);
  });
});
