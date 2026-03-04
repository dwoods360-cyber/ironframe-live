import { PrismaClient } from "@prisma/client-dmz";

const prismaDmzClientSingleton = () => {
  return new PrismaClient();
};

declare global {
  var prismaDmz: undefined | ReturnType<typeof prismaDmzClientSingleton>;
}

const prismaDmz = globalThis.prismaDmz ?? prismaDmzClientSingleton();

export default prismaDmz;

if (process.env.NODE_ENV !== "production") globalThis.prismaDmz = prismaDmz;
