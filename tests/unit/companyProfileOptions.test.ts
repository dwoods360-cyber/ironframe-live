import { describe, expect, it } from "vitest";

import {
  COMPANY_PROFILE_DEPARTMENT_OTHER,
  COMPANY_PROFILE_SECTOR_OTHER,
  initializeDepartmentPicklist,
  initializeSectorPicklist,
  isSectorPicklistReady,
  resolveDepartmentsFromPicklist,
  resolveSectorFromPicklist,
} from "@/app/lib/companyProfileOptions";

describe("companyProfileOptions", () => {
  it("maps known sector to select value", () => {
    expect(initializeSectorPicklist("Healthcare")).toEqual({
      select: "Healthcare",
      other: "",
    });
  });

  it("maps unknown sector to Other with free text", () => {
    expect(initializeSectorPicklist("Custom Mining")).toEqual({
      select: COMPANY_PROFILE_SECTOR_OTHER,
      other: "Custom Mining",
    });
  });

  it("requires Other text when Other sector is selected", () => {
    expect(isSectorPicklistReady(COMPANY_PROFILE_SECTOR_OTHER, "")).toBe(false);
    expect(isSectorPicklistReady(COMPANY_PROFILE_SECTOR_OTHER, "Mining")).toBe(true);
  });

  it("resolves departments from multi-select and Other text", () => {
    const selected = ["Finance", COMPANY_PROFILE_DEPARTMENT_OTHER];
    expect(resolveDepartmentsFromPicklist(selected, "Flight Operations, Legal")).toEqual([
      "Finance",
      "Flight Operations",
      "Legal",
    ]);
  });

  it("initializes department picklist from comma-separated raw value", () => {
    expect(initializeDepartmentPicklist("Finance, Flight Operations")).toEqual({
      selected: ["Finance", COMPANY_PROFILE_DEPARTMENT_OTHER],
      other: "Flight Operations",
    });
  });

  it("resolves sector from picklist", () => {
    expect(resolveSectorFromPicklist("Technology", "")).toBe("Technology");
    expect(resolveSectorFromPicklist(COMPANY_PROFILE_SECTOR_OTHER, "Biotech")).toBe("Biotech");
  });
});
