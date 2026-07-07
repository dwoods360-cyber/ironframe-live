import { PrismaClient } from '../../generated/client/index.js';
import { loadIronleadsEnv } from '../loadIronleadsEnv.js';

loadIronleadsEnv();

const globalForPrisma = globalThis as typeof globalThis & {
  ironleadsPrisma?: PrismaClient;
};

export function getIronleadsPrisma(): PrismaClient {
  if (!globalForPrisma.ironleadsPrisma) {
    globalForPrisma.ironleadsPrisma = new PrismaClient();
  }
  return globalForPrisma.ironleadsPrisma;
}

export async function disconnectIronleadsPrisma(): Promise<void> {
  if (!globalForPrisma.ironleadsPrisma) return;
  await globalForPrisma.ironleadsPrisma.$disconnect();
  globalForPrisma.ironleadsPrisma = undefined;
}
