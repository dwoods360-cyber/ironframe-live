import "server-only";

import { createHash } from "crypto";
import { headers } from "next/headers";

export async function getServerActionForensics(): Promise<{
  clientIp: string;
  fingerprintHash: string;
}> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  let clientIp = "unknown";
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) clientIp = first;
  } else {
    const real = h.get("x-real-ip")?.trim();
    if (real) clientIp = real;
  }

  const material = [
    h.get("user-agent") ?? "",
    h.get("accept-language") ?? "",
    h.get("sec-ch-ua") ?? "",
    h.get("sec-ch-ua-platform") ?? "",
    h.get("sec-ch-ua-mobile") ?? "",
  ].join("|");
  const fingerprintHash = createHash("sha256").update(material, "utf8").digest("hex");

  return { clientIp, fingerprintHash };
}
