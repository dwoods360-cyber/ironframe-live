import { describe, expect, it } from "vitest";
import { createMonitoringAlertId } from "@/app/vendors/monitoringAlertIds";

describe("createMonitoringAlertId", () => {
  it("generates unique ids for the same seed", () => {
    const a = createMonitoringAlertId("q", "azure-health");
    const b = createMonitoringAlertId("q", "azure-health");
    expect(a).not.toBe(b);
    expect(a.startsWith("q-azure-health-")).toBe(true);
  });
});
