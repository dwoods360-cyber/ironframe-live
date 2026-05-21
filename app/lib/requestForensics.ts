import "server-only";

import { createHash } from "crypto";

export function clientIpFromRequest(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  return "unknown";
}

/** Stable client environment fingerprint from request headers (proof of presence). */
export function fingerprintHashFromRequest(request: Request): string {
  const h = request.headers;
  const material = [
    h.get("user-agent") ?? "",
    h.get("accept-language") ?? "",
    h.get("sec-ch-ua") ?? "",
    h.get("sec-ch-ua-platform") ?? "",
    h.get("sec-ch-ua-mobile") ?? "",
  ].join("|");
  return createHash("sha256").update(material, "utf8").digest("hex");
}
