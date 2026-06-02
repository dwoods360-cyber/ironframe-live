import { describe, expect, it } from "vitest";
import {
  normalizeElectricityMapsZone,
  resolveElectricityMapsZoneForTenant,
} from "@/app/config/tenantCarbonZones";

describe("resolveElectricityMapsZoneForTenant", () => {
  it("maps unknown zone hints to the tenant roster zone during context switches", () => {
    expect(resolveElectricityMapsZoneForTenant("gridcore", "US-GD")).toBe("US-CO");
  });

  it("keeps valid roster zone hints", () => {
    expect(resolveElectricityMapsZoneForTenant("vaultbank", "US-NY")).toBe("US-NY");
  });
});

describe("normalizeElectricityMapsZone", () => {
  it("maps rogue hints via global aliases when tenant key is not yet bound", () => {
    expect(normalizeElectricityMapsZone("US-GD", null)).toBe("US-CO");
  });

  it("prefers tenant roster when tenant key is known", () => {
    expect(normalizeElectricityMapsZone("US-GD", "gridcore")).toBe("US-CO");
  });
});
