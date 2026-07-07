import { describe, expect, it } from "vitest";

import { PRODUCT_MATRIX } from "../../Ironboard/src/staticContext.ts";
import { buildProductMatrixHealthSnapshot } from "../../Ironboard/src/services/productMatrixHealth.ts";

describe("product matrix health", () => {
  it("includes core surfaces and perimeter poll workers", () => {
    const keys = PRODUCT_MATRIX.map((row) => row.key);
    expect(keys).toEqual([
      "ironframe-core",
      "ironboard-exec",
      "docs-hub-accessibility",
      "ironleads",
      "salesteam",
      "success-team",
      "support-team",
    ]);
  });

  it("builds a health snapshot with reachability per service", async () => {
    const snapshot = await buildProductMatrixHealthSnapshot();
    expect(snapshot.services).toHaveLength(PRODUCT_MATRIX.length);
    expect(snapshot.checkedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    for (const row of snapshot.services) {
      expect(row).toMatchObject({
        key: expect.any(String),
        name: expect.any(String),
        port: expect.any(Number),
        healthUrl: expect.stringMatching(/^http/),
        reachable: expect.any(Boolean),
      });
    }
  });
});
