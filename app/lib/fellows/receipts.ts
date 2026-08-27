import "server-only";

import type { FellowMissionCode, Prisma } from "@/prisma/generated/fellows-client";

import { mintMissionReceiptToken } from "@/app/lib/fellows/session";
import prismaFellows from "@/lib/prismaFellows";

const RECEIPT_TTL_MS = 15 * 60 * 1000;

export async function issueFellowMissionReceipt(input: {
  fellowId: string;
  missionCode: FellowMissionCode;
  payload: Record<string, unknown>;
}): Promise<{ receiptId: string; receiptToken: string; expiresAt: Date }> {
  const receiptToken = mintMissionReceiptToken();
  const expiresAt = new Date(Date.now() + RECEIPT_TTL_MS);
  const row = await prismaFellows.fellowMissionReceipt.create({
    data: {
      fellowId: input.fellowId,
      missionCode: input.missionCode,
      receiptToken,
      payloadJson: input.payload as Prisma.InputJsonValue,
      expiresAt,
    },
    select: { id: true, receiptToken: true, expiresAt: true },
  });
  return {
    receiptId: row.id,
    receiptToken: row.receiptToken,
    expiresAt: row.expiresAt,
  };
}

export async function consumeFellowMissionReceipt(input: {
  fellowId: string;
  missionCode: FellowMissionCode;
  receiptToken: string;
}): Promise<{ ok: true; payload: Record<string, unknown> } | { ok: false; error: string }> {
  const row = await prismaFellows.fellowMissionReceipt.findUnique({
    where: { receiptToken: input.receiptToken },
  });
  if (!row || row.fellowId !== input.fellowId) {
    return { ok: false, error: "Invalid mission receipt" };
  }
  if (row.missionCode !== input.missionCode) {
    return { ok: false, error: "Receipt mission mismatch" };
  }
  if (row.expiresAt.getTime() < Date.now()) {
    return { ok: false, error: "Mission receipt expired — re-run the lab action" };
  }
  if (row.consumedAt) {
    return { ok: false, error: "Mission receipt already consumed" };
  }
  await prismaFellows.fellowMissionReceipt.update({
    where: { id: row.id },
    data: { consumedAt: new Date() },
  });
  const payload =
    row.payloadJson && typeof row.payloadJson === "object" && !Array.isArray(row.payloadJson)
      ? (row.payloadJson as Record<string, unknown>)
      : {};
  return { ok: true, payload };
}
