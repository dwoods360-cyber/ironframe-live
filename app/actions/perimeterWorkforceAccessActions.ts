"use server";

import { canUsePerimeterWorkforceFromSession } from "@/app/lib/auth/perimeterWorkforceAccess";

/** Client nav gate — Operations Hub chip (fail-closed). */
export async function getPerimeterWorkforceAccess(): Promise<{ canAccess: boolean }> {
  return { canAccess: await canUsePerimeterWorkforceFromSession() };
}
