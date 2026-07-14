import { describe, expect, it, vi } from "vitest";

import { fetchOpsPortalJson } from "@/app/utils/fetchOpsPortalJson";

describe("fetchOpsPortalJson", () => {
  it("returns parsed JSON on success", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      ),
    );

    await expect(
      fetchOpsPortalJson<{ ok: boolean }>("/api/admin/operations-hub", undefined, "fail"),
    ).resolves.toEqual({ ok: true });
  });

  it("surfaces empty body errors instead of JSON parse failures", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response("", {
          status: 500,
          headers: { "content-type": "application/json" },
        }),
      ),
    );

    await expect(
      fetchOpsPortalJson("/api/admin/operations-hub", undefined, "fail"),
    ).rejects.toThrow(/Empty response/);
  });

  it("joins error and hint from error JSON bodies", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            error: "TARGET_TENANT_NOT_FOUND: medshield",
            hint: "Set IRONFRAME_OPERATIONS_CRM_SCOPE_SLUG",
          }),
          {
            status: 404,
            headers: { "content-type": "application/json" },
          },
        ),
      ),
    );

    await expect(
      fetchOpsPortalJson("/api/admin/operations-hub/support-intake", undefined, "fail"),
    ).rejects.toThrow(/TARGET_TENANT_NOT_FOUND[\s\S]*IRONFRAME_OPERATIONS_CRM_SCOPE_SLUG/);
  });
});
