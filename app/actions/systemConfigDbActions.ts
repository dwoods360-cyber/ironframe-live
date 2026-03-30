"use server";

import prisma from "@/lib/prisma";

/** Phone Home / Irontech escalation inbox (persisted). */
export async function getAdminAlertEmail(): Promise<string | null> {
  const row = await prisma.systemConfig.findUnique({
    where: { id: "global" },
    select: { adminAlertEmail: true },
  });
  const v = row?.adminAlertEmail?.trim();
  return v?.length ? v : null;
}

export async function setAdminAlertEmail(
  email: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const trimmed = email.trim();
  try {
    await prisma.systemConfig.upsert({
      where: { id: "global" },
      create: {
        id: "global",
        adminAlertEmail: trimmed.length > 0 ? trimmed : null,
      },
      update: {
        adminAlertEmail: trimmed.length > 0 ? trimmed : null,
      },
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
