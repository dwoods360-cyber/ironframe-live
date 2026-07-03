import { describe, expect, it } from "vitest";

import {
  buildTrainerWelcomeSkeleton,
} from "../services/orientationWelcomeScriptGenerator.js";

describe("orientationWelcomeScriptGenerator", () => {
  it("trainer skeleton is platform-wide with no tenant-specific names", () => {
    const body = buildTrainerWelcomeSkeleton();

    expect(body).toContain("Welcome to Ironframe");
    expect(body).toContain("isolated tenant workspace");
    expect(body).not.toContain("Blackwoods");
    expect(body).not.toContain("Coffee Co");
    expect(body).toContain("before your guided training");
    expect(body.toLowerCase()).not.toContain("password");
    expect(body.toLowerCase()).not.toContain("msa");
  });
});
