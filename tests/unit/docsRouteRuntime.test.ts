import { describe, expect, it } from "vitest";
import { DOCS_FS_ROUTE_DYNAMIC } from "@/lib/docsRouteRuntime";

describe("DOCS_FS_ROUTE_DYNAMIC", () => {
  it("forces dynamic rendering for filesystem-backed docs ingress", () => {
    expect(DOCS_FS_ROUTE_DYNAMIC).toBe("force-dynamic");
  });
});
