import "server-only";

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { Resend } from "resend";

import prismaFellows from "@/lib/prismaFellows";

export const FELLOW_ACCESS_TOKEN_TTL_MS = 15 * 60 * 1000;
export const FELLOW_ACCESS_REQUEST_COOLDOWN_MS = 60 * 1000;

export function hashFellowAccessToken(rawToken: string): string {
  return createHash("sha256").update(rawToken, "utf8").digest("hex");
}

export function mintFellowAccessToken(now = new Date()): {
  rawToken: string;
  tokenHash: string;
  expiresAt: Date;
} {
  const rawToken = randomBytes(32).toString("hex");
  return {
    rawToken,
    tokenHash: hashFellowAccessToken(rawToken),
    expiresAt: new Date(now.getTime() + FELLOW_ACCESS_TOKEN_TTL_MS),
  };
}

function hashesEqual(a: string, b: string): boolean {
  try {
    const left = Buffer.from(a, "hex");
    const right = Buffer.from(b, "hex");
    return left.length > 0 && left.length === right.length && timingSafeEqual(left, right);
  } catch {
    return false;
  }
}

function resolvePublicOrigin(requestOrigin: string): string {
  const configured = process.env.FELLOWS_PORTAL_PUBLIC_ORIGIN?.trim();
  const candidate = configured || (process.env.NODE_ENV !== "production" ? requestOrigin : "");
  if (!candidate) throw new Error("FELLOWS_PORTAL_PUBLIC_ORIGIN is required in production");

  const origin = new URL(candidate);
  if (process.env.NODE_ENV === "production" && origin.protocol !== "https:") {
    throw new Error("FELLOWS_PORTAL_PUBLIC_ORIGIN must use HTTPS in production");
  }
  return origin.origin;
}

async function sendFellowAccessEmail(email: string, verifyUrl: string): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return false;

  const fromEmail =
    process.env.FELLOWS_FROM_EMAIL?.trim() ||
    process.env.WORKSPACE_INVITE_FROM_EMAIL?.trim() ||
    "delivery@ironframegrc.com";
  try {
    const response = await new Resend(apiKey).emails.send({
      from: `Ironframe Fellows <${fromEmail}>`,
      to: [email],
      subject: "Your Ironframe Fellows access link",
      text: [
        "Use this single-use link to open your Ironframe Fellows lab:",
        "",
        verifyUrl,
        "",
        "This link expires in 15 minutes. If you did not request it, ignore this email.",
      ].join("\n"),
    });
    return !response.error;
  } catch (error) {
    console.error(
      "[fellows/access] access-link delivery failed",
      error instanceof Error ? error.message : "unknown delivery error",
    );
    return false;
  }
}

export async function issueFellowAccessVerification(input: {
  fellowId: string;
  email: string;
  requestOrigin: string;
  lastRequestedAt?: Date | null;
}): Promise<{ delivered: boolean; devVerifyUrl?: string }> {
  const now = new Date();
  if (
    input.lastRequestedAt &&
    now.getTime() - input.lastRequestedAt.getTime() < FELLOW_ACCESS_REQUEST_COOLDOWN_MS
  ) {
    return { delivered: true };
  }

  const minted = mintFellowAccessToken(now);
  const origin = resolvePublicOrigin(input.requestOrigin);
  const verifyUrl = new URL("/api/fellows/verify", origin);
  verifyUrl.searchParams.set("token", minted.rawToken);

  await prismaFellows.fellow.update({
    where: { id: input.fellowId },
    data: {
      accessTokenHash: minted.tokenHash,
      accessTokenExpiresAt: minted.expiresAt,
      accessTokenConsumedAt: null,
      accessTokenRequestedAt: now,
    },
  });

  const delivered = await sendFellowAccessEmail(input.email, verifyUrl.toString());
  return {
    delivered,
    ...(process.env.NODE_ENV !== "production" ? { devVerifyUrl: verifyUrl.toString() } : {}),
  };
}

export async function consumeFellowAccessVerification(
  rawToken: string | null | undefined,
): Promise<{ fellowId: string } | null> {
  const token = (rawToken ?? "").trim();
  if (!/^[a-f0-9]{64}$/i.test(token)) return null;

  const tokenHash = hashFellowAccessToken(token);
  const fellow = await prismaFellows.fellow.findUnique({
    where: { accessTokenHash: tokenHash },
    select: {
      id: true,
      status: true,
      accessTokenHash: true,
      accessTokenExpiresAt: true,
      accessTokenConsumedAt: true,
    },
  });
  if (
    !fellow?.accessTokenHash ||
    !hashesEqual(fellow.accessTokenHash, tokenHash) ||
    fellow.status === "REVOKED" ||
    fellow.accessTokenConsumedAt ||
    !fellow.accessTokenExpiresAt ||
    fellow.accessTokenExpiresAt.getTime() <= Date.now()
  ) {
    return null;
  }

  const consumed = await prismaFellows.fellow.updateMany({
    where: {
      id: fellow.id,
      accessTokenHash: tokenHash,
      accessTokenConsumedAt: null,
      accessTokenExpiresAt: { gt: new Date() },
      status: { not: "REVOKED" },
    },
    data: {
      status: "ACTIVE",
      accessTokenHash: null,
      accessTokenConsumedAt: new Date(),
    },
  });
  return consumed.count === 1 ? { fellowId: fellow.id } : null;
}
