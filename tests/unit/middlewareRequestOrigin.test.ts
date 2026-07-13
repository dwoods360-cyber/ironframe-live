import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";

import {
  browserFacingOriginFromHeaders,
  browserFacingRequestOrigin,
  browserFacingUrl,
} from "@/app/lib/middlewareRequestOrigin";

describe("middlewareRequestOrigin", () => {
  it("preserves tenant host when request.url is normalized to localhost", () => {
    const request = new NextRequest("http://localhost:3000/exports", {
      headers: { host: "acorp.lvh.me:3000" },
    });

    expect(browserFacingRequestOrigin(request)).toBe("http://acorp.lvh.me:3000");
    expect(browserFacingUrl(request, "/login").toString()).toBe("http://acorp.lvh.me:3000/login");
  });

  it("builds login redirect origin from forwarded headers in RSC layouts", () => {
    const headers = new Headers({
      host: "run3b.lvh.me:3000",
      "x-forwarded-proto": "http",
    });

    expect(browserFacingOriginFromHeaders(headers)).toBe("http://run3b.lvh.me:3000");
  });
});
