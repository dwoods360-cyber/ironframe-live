"use server";

import { revalidatePath } from "next/cache";

export async function revalidateBoard(): Promise<void> {
  revalidatePath("/");
  revalidatePath("/reports/ops");
}
