import { describe, expect, it } from "vitest";

import {
  GET_STARTED_ORIENTATION_HASH,
  GET_STARTED_QUICKSTART_GUIDE_HREF,
} from "@/app/components/onboarding/GetStartedOrientationFallback";
import { GET_STARTED_STEPS } from "@/app/lib/getStartedSteps";
import { GET_STARTED_STEP_VISUALS } from "@/app/lib/getStartedStepVisuals";

describe("GetStarted orientation guide", () => {
  it("uses stable hash and quickstart href for inline reader", () => {
    expect(GET_STARTED_ORIENTATION_HASH).toBe("orientation-guide");
    expect(GET_STARTED_QUICKSTART_GUIDE_HREF).toBe("/docs/user-manuals/quickstart");
  });

  it("maps export-path step to dashboard exports console and screenshot", () => {
    const exportStep = GET_STARTED_STEPS.find((step) => step.id === "export-path");
    expect(exportStep?.href).toBe("/exports");
    expect(GET_STARTED_STEP_VISUALS["export-path"].screenshotSrc).toContain(
      "level-2-05-audit-trail-exports",
    );
  });
});
