import "server-only";

import { createHmac, timingSafeEqual } from "crypto";

const TTL_MS = 72 * 60 * 60 * 1000;

function getSecret(): string {
  const s = process.env.INVESTOR_REPORT_SHARE_SECRET?.trim();
  if (!s) throw new Error("INVESTOR_REPORT_SHARE_SECRET is not configured.");
  return s;
}

export type InvestorReportTokenPayload = {
  v: 1;
  relPath: string;
  exp: number;
};

function signPayload(payload: InvestorReportTokenPayload): string {
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const sig = createHmac("sha256", getSecret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function signInvestorReportDownloadToken(relPath: string, nowMs = Date.now()): string {
  return signPayload({
    v: 1,
    relPath,
    exp: nowMs + TTL_MS,
  });
}

/** Longer-lived token for public transparency badge / CMS (default 90d). */
export function signInvestorReportDownloadTokenWithTtl(
  relPath: string,
  ttlMs: number,
  nowMs = Date.now(),
): string {
  return signPayload({
    v: 1,
    relPath,
    exp: nowMs + Math.max(ttlMs, 60_000),
  });
}

export function verifyInvestorReportDownloadToken(token: string): InvestorReportTokenPayload | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [body, sig] = parts;
  if (!body || !sig) return null;
  const expected = createHmac("sha256", getSecret()).update(body).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const json = Buffer.from(body, "base64url").toString("utf8");
    const payload = JSON.parse(json) as InvestorReportTokenPayload;
    if (payload.v !== 1 || typeof payload.relPath !== "string" || typeof payload.exp !== "number") {
      return null;
    }
    if (Date.now() > payload.exp) return null;
    if (!payload.relPath.startsWith("worm/") || payload.relPath.includes("..")) return null;
    return payload;
  } catch {
    return null;
  }
}
