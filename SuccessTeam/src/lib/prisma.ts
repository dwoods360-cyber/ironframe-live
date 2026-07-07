import '../loadSuccessTeamEnv.js';

import { PrismaClient } from '../../generated/client/index.js';

let prisma: PrismaClient | null = null;

export function getSuccessTeamPrisma(): PrismaClient {
  if (!prisma) {
    prisma = new PrismaClient();
  }
  return prisma;
}
