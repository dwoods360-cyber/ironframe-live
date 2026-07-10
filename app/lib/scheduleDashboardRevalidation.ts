import "server-only";

import { revalidatePath } from "next/cache";
import { unstable_after as after } from "next/server";
import { isServerlessRuntime } from "@/lib/prismaServerless";

/** Defer path revalidation on serverless so open Prisma transactions can release the pool connection first. */
export function scheduleDashboardRevalidation(...paths: string[]): void {
  const unique = [...new Set(paths.filter((p) => p.trim().length > 0))];
  if (unique.length === 0) return;

  const run = () => {
    for (const path of unique) {
      revalidatePath(path);
    }
  };

  if (isServerlessRuntime()) {
    after(run);
    return;
  }
  run();
}
