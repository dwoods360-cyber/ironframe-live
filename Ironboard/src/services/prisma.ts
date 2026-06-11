// Ironboard has a nested @prisma/client stub; use the repo-root generated client.
import { PrismaClient } from '../../../node_modules/@prisma/client/index.js';
import { loadIronboardEnv } from '../loadIronboardEnv.js';

loadIronboardEnv();

const globalForPrisma = globalThis as typeof globalThis & { ironboardPrisma?: PrismaClient };

export function getPrisma(): PrismaClient {
  if (!process.env.DATABASE_URL?.trim()) {
    throw new Error('DATABASE_URL is not set. Add it to Ironboard/.env.local or repo-root .env.local.');
  }
  if (!globalForPrisma.ironboardPrisma) {
    globalForPrisma.ironboardPrisma = new PrismaClient();
  }
  return globalForPrisma.ironboardPrisma;
}
