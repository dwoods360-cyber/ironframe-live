import "server-only";

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

import {
  FELLOWS_SESSION_COOKIE,
} from "@/config/fellowsPortal";

function sessionSecret(): string {
  const s =
    process.env.FELLOWS_SESSION_SECRET?.trim() ||
    process.env.IRONFRAME_CRON_SECRET?.trim() ||
    process.env.INTERNAL_GATEWAY_SECRET_KEY?.trim();
  if (!s) {
    throw new Error("FELLOWS_SESSION_SECRET (or CRON/GATEWAY secret) required");
  }
  return s;
}

export type FellowSessionPayload = {
  fellowId: string;
  exp: number;
};

function sign(payloadB64: string): string {
  return createHmac("sha256", sessionSecret()).update(payloadB64).digest("base64url");
}

export function mintFellowSessionToken(fellowId: string, ttlSeconds = 60 * 60 * 24 * 30): string {
  const payload: FellowSessionPayload = {
    fellowId,
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return `${payloadB64}.${sign(payloadB64)}`;
}

export function verifyFellowSessionToken(token: string | null | undefined): FellowSessionPayload | null {
  if (!token || !token.includes(".")) return null;
  const [payloadB64, sig] = token.split(".");
  if (!payloadB64 || !sig) return null;
  const expected = sign(payloadB64);
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  try {
    const payload = JSON.parse(
      Buffer.from(payloadB64, "base64url").toString("utf8"),
    ) as FellowSessionPayload;
    if (!payload.fellowId || !payload.exp) return null;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function readFellowSessionFromCookies(): Promise<FellowSessionPayload | null> {
  const jar = await cookies();
  return verifyFellowSessionToken(jar.get(FELLOWS_SESSION_COOKIE)?.value);
}

export function mintMissionReceiptToken(): string {
  return randomBytes(32).toString("hex");
}
