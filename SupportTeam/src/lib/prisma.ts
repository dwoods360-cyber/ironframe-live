import { PrismaClient } from '../../generated/client/index.js';

import { loadSupportTeamEnv } from '../loadSupportTeamEnv.js';

loadSupportTeamEnv();

let prisma: PrismaClient | null = null;

export function getSupportTeamPrisma(): PrismaClient {
  if (!prisma) {
    prisma = new PrismaClient();
  }
  return prisma;
}
