/**
 * Academic Fellowship Prisma client — isolated schema `academic_fellows`.
 * Never import `@/lib/prisma` from fellows routes for fellow data.
 */
import "server-only";

import { PrismaClient } from "@/prisma/generated/fellows-client";
import { isServerlessRuntime } from "@/lib/prismaServerless";
import { resolveFellowsDatabaseUrl } from "@/lib/fellowsDatabaseUrl";

const prismaFellowsSingleton = () => {
  const datasourceUrl = resolveFellowsDatabaseUrl();
  return new PrismaClient({
    datasources: {
      db: { url: datasourceUrl },
    },
  });
};

declare global {
  // eslint-disable-next-line no-var
  var prismaFellows: undefined | ReturnType<typeof prismaFellowsSingleton>;
}

const globalForFellows = globalThis as typeof globalThis & {
  prismaFellows?: ReturnType<typeof prismaFellowsSingleton>;
};

const prismaFellows = globalForFellows.prismaFellows ?? prismaFellowsSingleton();
if (isServerlessRuntime() || process.env.NODE_ENV !== "production") {
  globalForFellows.prismaFellows = prismaFellows;
}

export default prismaFellows;
