import { describe, expect, it } from "vitest";

import { parseJsonResponse } from "@/app/utils/parseJsonResponse";

function mockResponse(input: {
  status?: number;
  body: string;
  contentType?: string;
  redirected?: boolean;
  url?: string;
}): Response {
  return {
    status: input.status ?? 200,
    ok: (input.status ?? 200) >= 200 && (input.status ?? 200) < 300,
    headers: new Headers({
      "content-type": input.contentType ?? "application/json",
    }),
    redirected: input.redirected ?? false,
    url: input.url ?? "https://ironframegrc.com/api/admin/operations-hub/support-intake",
    text: async () => input.body,
  } as Response;
}

describe("parseJsonResponse", () => {
  it("parses valid JSON bodies", async () => {
    const result = await parseJsonResponse<{ ok: boolean }>(
      mockResponse({ body: '{"ok":true}' }),
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.ok).toBe(true);
  });

  it("surfaces empty bodies with status instead of throwing", async () => {
    const result = await parseJsonResponse(mockResponse({ status: 500, body: "" }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("Empty response");
  });

  it("detects login redirects for expired sessions", async () => {
    const result = await parseJsonResponse(
      mockResponse({
        status: 200,
        body: "",
        redirected: true,
        url: "https://ironframegrc.com/login?next=%2Fdashboard",
      }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("Session expired");
  });

  it("rejects non-JSON content types", async () => {
    const result = await parseJsonResponse(
      mockResponse({
        status: 200,
        body: "<html></html>",
        contentType: "text/html",
      }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("Unexpected response type");
  });
});
