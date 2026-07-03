import { describe, expect, it, vi, beforeEach } from "vitest";

import { fetchUtilityRateForAnalystExport } from "@/app/services/ironbloom/rateEngine";

vi.mock("@/app/services/ironbloom/rateEngine", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/app/services/ironbloom/rateEngine")>();
  return {
    ...actual,
    fetchUtilityRateForLocation: vi.fn(),
  };
});

import { fetchUtilityRateForLocation } from "@/app/services/ironbloom/rateEngine";

describe("fetchUtilityRateForAnalystExport", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("falls back to forensic estimate when live source is required but absent", async () => {
    vi.mocked(fetchUtilityRateForLocation).mockRejectedValue(
      new Error(
        "[IRONBLOOM_LIVE_SOURCE_REQUIRED] No live utility rate returned for zip 02115. Configure OPEN_ENERGY_API_KEY and provider access.",
      ),
    );

    const quote = await fetchUtilityRateForAnalystExport({
      country: "USA",
      zipCode: "02115",
      countryCode: "US",
    });

    expect(quote.unitType).toBe("kWh");
    expect(quote.source).toBe("forensic-estimate");
    expect(quote.jurisdiction).toBe("USA:02115");
    expect(quote.rateUsdPerUnit).toBeGreaterThan(0);
  });
});
