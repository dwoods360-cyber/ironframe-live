import { describe, expect, it } from "vitest";

import {
  listCrosswalkTargets,
  resolveFrameworkCrosswalk,
} from "@/app/lib/irontally/frameworkCrosswalk";

describe("frameworkCrosswalk", () => {
  it("maps SOC2 CC6.1 to EU AI Act via Irongate directive anchor", () => {
    const edges = resolveFrameworkCrosswalk({
      sourceFramework: "soc2_type2",
      sourceControlId: "CC6.1",
      targetFramework: "eu_ai_act",
    });
    expect(edges.length).toBeGreaterThan(0);
    expect(edges[0]?.targetFramework).toBe("eu_ai_act");
    expect(edges[0]?.directiveId).toBe("irongate");
  });

  it("lists crosswalk targets for a source control", () => {
    const targets = listCrosswalkTargets("soc2_type2", "CC6.1");
    expect(targets).toContain("eu_ai_act");
  });

  it("returns empty edges for unknown control ids", () => {
    const edges = resolveFrameworkCrosswalk({
      sourceFramework: "soc2_type2",
      sourceControlId: "UNKNOWN-CONTROL",
      targetFramework: "dora",
    });
    expect(edges).toEqual([]);
  });
});
