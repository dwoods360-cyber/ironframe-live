import { describe, expect, it } from "vitest";

import {
  AGENTIC_BOARD_ROSTER,
  buildStaticContextBundle,
  PERIMETER_WORKFORCE_APPS,
  PERIMETER_WORKFORCE_BINDING,
  PRODUCT_MATRIX,
} from "../../Ironboard/src/staticContext.ts";

describe("perimeter workforce board awareness", () => {
  it("registers all isolated poll worker apps with ports and CRM stages", () => {
    const ids = PERIMETER_WORKFORCE_APPS.map((app) => app.id);
    expect(ids).toContain("ironframe");
    expect(ids).toContain("ironboard");
    expect(ids).toContain("ironleads");
    expect(ids).toContain("salesteam");
    expect(ids).toContain("success-team");
    expect(ids).toContain("support-team");
    expect(PERIMETER_WORKFORCE_APPS.find((a) => a.id === "salesteam")?.port).toBe(8084);
    expect(PERIMETER_WORKFORCE_APPS.find((a) => a.id === "success-team")?.crmStage).toBe(
      "CLOSED_WON",
    );
    expect(PERIMETER_WORKFORCE_APPS.find((a) => a.id === "support-team")?.port).toBe(8086);
  });

  it("lists each perimeter worker once in the consolidated fleet panel", () => {
    const keys = PRODUCT_MATRIX.map((row) => row.key);
    expect(keys).toEqual([
      "ironframe-core",
      "ironboard-exec",
      "ironleads",
      "salesteam",
      "success-team",
      "support-team",
      "docs-hub-accessibility",
    ]);
    for (const app of PERIMETER_WORKFORCE_APPS) {
      const row = PRODUCT_MATRIX.find((entry) => entry.name === app.label);
      expect(row?.role).toBe(app.role);
      expect(row?.port).toBe(app.port);
    }
  });

  it("injects perimeter workforce binding into board static context", () => {
    const bundle = buildStaticContextBundle();
    expect(bundle).toContain("PERIMETER WORKFORCE APP REGISTRY");
    expect(bundle).toContain("Ironleads :8083");
    expect(bundle).toContain("IronSuccessTeam :8085");
    expect(bundle).toContain("IronSupportTeam :8086");
    expect(PERIMETER_WORKFORCE_BINDING).toContain("SUSPECT → Ironleads");
    expect(PERIMETER_WORKFORCE_BINDING).toContain("PROSPECT → SalesTeam");
    expect(PERIMETER_WORKFORCE_BINDING).toContain("IronSupportTeam");
  });

  it("assigns board owners for each perimeter app", () => {
    const marketing = AGENTIC_BOARD_ROSTER.find((a) => a.id === "board-marketing-mgr");
    const sales = AGENTIC_BOARD_ROSTER.find((a) => a.id === "board-sales-lead");
    const csm = AGENTIC_BOARD_ROSTER.find((a) => a.id === "board-customer-success");
    const bot = AGENTIC_BOARD_ROSTER.find((a) => a.id === "board-bot");

    expect(marketing?.expertise.some((e) => e.includes("Ironleads"))).toBe(true);
    expect(sales?.expertise.some((e) => e.includes("SalesTeam"))).toBe(true);
    expect(csm?.expertise.some((e) => e.includes("IronSuccessTeam"))).toBe(true);
    expect(bot?.expertise.some((e) => e.includes("Perimeter"))).toBe(true);

    const ironleads = PERIMETER_WORKFORCE_APPS.find((a) => a.id === "ironleads");
    expect(ironleads?.boardOwnerIds).toContain("board-marketing-mgr");
  });
});
