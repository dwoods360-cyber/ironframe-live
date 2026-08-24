import { describe, expect, it } from "vitest";

import {
  hasAdjacentWordStumble,
  hasRunOnEconomics,
  lintSalesHumanVoice,
} from "@/app/lib/salesHumanVoice";

describe("salesHumanVoice", () => {
  it("flags stacks/stack stumble", () => {
    expect(
      hasAdjacentWordStumble(
        "When AbacusFlex stacks clients onto the same delivery stack, how do you isolate?",
      ),
    ).toBe(true);
  });

  it("flags run-on economics", () => {
    expect(
      hasRunOnEconomics(
        "Economics: $4,999 flat for 90 days around 2–3 success criteria you set for isolating evidence — against planned GA for Ironframe Command at ~$35,000/year.",
      ),
    ).toBe(true);
  });

  it("passes spoken founder Touch 2 body", () => {
    const body = [
      "Hi Jonathan,",
      "",
      "When you're managing financial-services and healthcare accounts on AbacusFlex, how do you keep each client's compliance evidence and board reporting isolated today — without shared-stack register risk?",
      "",
      "We're keeping this Design Partner group to 3–5 MSP/MSSP operators so we can build around your team's workflow, not a generic roadmap.",
      "",
      "The economics stay simple. $4,999 flat for a 90-day seat around 2–3 criteria you set.",
      "Planned GA for Ironframe Command is ~$35,000/yr.",
      "",
      "If client-isolated evidence is on your radar this quarter, are you open to a 10–15 minute workflow review next week — peer to peer, not a product tour?",
    ].join("\n");
    expect(lintSalesHumanVoice(body).ok).toBe(true);
  });
});
