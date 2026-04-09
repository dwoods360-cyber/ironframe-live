import { PrismaClient } from "@prisma/client";

if (!(BigInt.prototype as any).toJSON) {
  (BigInt.prototype as any).toJSON = function () {
    return this.toString();
  };
}

const prismaAdminClientSingleton = () =>
  new PrismaClient({
    ...(process.env.DATABASE_URL_ADMIN?.trim()
      ? {
          datasources: {
            db: { url: process.env.DATABASE_URL_ADMIN },
          },
        }
      : {}),
  });

declare global {
  var prismaAdmin: undefined | ReturnType<typeof prismaAdminClientSingleton>;
}

export const prismaAdmin =
  globalThis.prismaAdmin ?? prismaAdminClientSingleton();

if (process.env.NODE_ENV !== "production") {
  globalThis.prismaAdmin = prismaAdmin;
}
