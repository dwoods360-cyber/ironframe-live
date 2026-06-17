import { describe, expect, it } from "vitest";
import { buildTenantBrand, deriveTenantShortLabel } from "@/app/lib/brand/formatTenantBrand";

describe("formatTenantBrand", () => {
  it("uses seed accent and DB name for vaultbank", () => {
    const brand = buildTenantBrand("vaultbank", "Vaultbank Financial Corp", 590_000_000n);
    expect(brand.shortLabel).toBe("VAULTBANK");
    expect(brand.accentClass).toBe("text-emerald-500");
    expect(brand.aleDisplay).toBe("$5.9M");
    expect(brand.displayName).toBe("Vaultbank Financial Corp");
  });

  it("derives dynamic tenant labels from slug", () => {
    expect(deriveTenantShortLabel("acmecorp", "Acme Corporation")).toBe("ACMECORP");
    const brand = buildTenantBrand("acmecorp", "Acme Corporation", 0);
    expect(brand.shortLabel).toBe("ACMECORP");
    expect(brand.accentClass).toBe("text-emerald-600");
  });
});
