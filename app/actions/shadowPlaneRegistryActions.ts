"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";

/**
 * Row-level Shadow Plane restore:
 * clears breach marker and returns persona to PROTECTED state.
 */
export async function restoreSyntheticEmployeeAction(
  syntheticEmployeeId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const id = syntheticEmployeeId.trim();
  if (!id) return { ok: false, error: "Missing synthetic employee id." };

  try {
    await prisma.syntheticEmployee.update({
      where: { id },
      data: {
        isBreached: false,
        status: "PROTECTED" as any,
      } as any,
    });
    revalidatePath("/integrity");
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Restore failed";
    return { ok: false, error: message };
  }
}
