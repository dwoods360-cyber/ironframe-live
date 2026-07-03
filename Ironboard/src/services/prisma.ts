// Ironboard has a nested @prisma/client stub; use the repo-root generated client.
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { loadIronboardEnv } from '../loadIronboardEnv.js';

loadIronboardEnv();

const require = createRequire(import.meta.url);
const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const { PrismaClient } = require(join(repoRoot, 'node_modules', '@prisma/client')) as typeof import('@prisma/client');

const globalForPrisma = globalThis as typeof globalThis & {
  ironboardPrisma?: InstanceType<typeof PrismaClient>;
};

export function getPrisma(): InstanceType<typeof PrismaClient> {
  if (!process.env.DATABASE_URL?.trim()) {
    throw new Error('DATABASE_URL is not set. Add it to Ironboard/.env.local or repo-root .env.local.');
  }
  if (!globalForPrisma.ironboardPrisma) {
    globalForPrisma.ironboardPrisma = new PrismaClient();
  }
  return globalForPrisma.ironboardPrisma;
}

export async function disconnectPrisma(): Promise<void> {
  if (!globalForPrisma.ironboardPrisma) return;
  await globalForPrisma.ironboardPrisma.$disconnect();
  globalForPrisma.ironboardPrisma = undefined;
}
