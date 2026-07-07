import { describe, expect, it } from "vitest";

import { OPERATIONS_HUB_WORKFORCE_IDS } from "@/app/lib/server/operationsHubCore";

describe("operations hub workforce registry", () => {
  it("probes all perimeter poll workers including IronSupportTeam", () => {
    expect(OPERATIONS_HUB_WORKFORCE_IDS).toEqual([
      "ironboard",
      "ironleads",
      "salesteam",
      "success-team",
      "support-team",
    ]);
  });
});
