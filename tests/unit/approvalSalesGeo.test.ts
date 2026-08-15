import { describe, expect, it } from "vitest";
import {
  compareSalesOutreachGeo,
  inferSalesOutreachGeo,
  isUsSalesOutreachBand,
  parseApprovalGeoFilter,
} from "@/app/lib/approvalSalesGeo";

describe("approvalSalesGeo", () => {
  it("defaults SALES track to US when geo param omitted", () => {
    expect(parseApprovalGeoFilter(null, "SALES")).toBe("US");
    expect(parseApprovalGeoFilter(undefined, "SALES")).toBe("US");
    expect(parseApprovalGeoFilter("ALL", "SALES")).toBe("ALL");
    expect(parseApprovalGeoFilter(null, "SUPPORT")).toBe("ALL");
  });

  it("ranks clear non-US TLDs below US", () => {
    const us = inferSalesOutreachGeo({
      email: "tom@kirkhamirontech.com",
      company: "Kirkham IronTech",
      country: "United States",
    });
    const ca = inferSalesOutreachGeo({
      email: "adrian.ghira@gamtech.ca",
      company: "GAM Tech",
    });
    expect(us.band).toBe("US");
    expect(ca.band).toBe("NON_US");
    expect(compareSalesOutreachGeo(us, ca)).toBeLessThan(0);
    expect(isUsSalesOutreachBand(us.band)).toBe(true);
    expect(isUsSalesOutreachBand(ca.band)).toBe(false);
  });

  it("flags company geo hints (Colombia / Nepal)", () => {
    expect(
      inferSalesOutreachGeo({
        company: "Grupo Microsistemas Colombia",
        email: "esteban@gmsseguridad.com",
      }).band,
    ).toBe("NON_US");
    expect(
      inferSalesOutreachGeo({
        company: "Cryptogen Nepal",
        email: "nirmal.dahal@cryptogennepal.com",
      }).band,
    ).toBe("NON_US");
  });

  it("prefers ET/CT state location", () => {
    const r = inferSalesOutreachGeo({
      email: "a@example.com",
      company: "Acme MSSP",
      location: "Austin, TX",
    });
    expect(r.band).toBe("US_PREFERRED");
  });
});
