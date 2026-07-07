import { afterEach, describe, expect, it, vi } from "vitest";

import {
  isE2eProductionTarget,
  tenantSubdomainOrigin,
} from "../e2e/helpers/ingestionPipeline";

describe("e2e tenant origin", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("defaults to local lvh.me workspace", () => {
    vi.stubEnv("E2E_PRODUCTION", "");
    expect(tenantSubdomainOrigin("bwc")).toBe("http://bwc.lvh.me:3000");
    expect(isE2eProductionTarget()).toBe(false);
  });

  it("targets production apex when E2E_PRODUCTION=1", () => {
    vi.stubEnv("E2E_PRODUCTION", "1");
    expect(tenantSubdomainOrigin("bwc")).toBe("https://bwc.ironframegrc.com");
    expect(isE2eProductionTarget()).toBe(true);
  });

  it("honors explicit E2E_TENANT_ORIGIN override", () => {
    vi.stubEnv("E2E_TENANT_ORIGIN", "https://bwc.ironframegrc.com");
    expect(tenantSubdomainOrigin("bwc")).toBe("https://bwc.ironframegrc.com");
  });
});
