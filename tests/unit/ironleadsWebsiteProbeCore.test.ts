import { describe, expect, it } from "vitest";

import { probeCompanyWebsite } from "@/app/lib/server/ironleadsWebsiteProbeCore";

describe("ironleadsWebsiteProbeCore", () => {
  it("returns null for empty company names without probing", async () => {
    expect(await probeCompanyWebsite("")).toBeNull();
    expect(await probeCompanyWebsite("A")).toBeNull();
  });
});
