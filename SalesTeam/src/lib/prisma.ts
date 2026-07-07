import { PrismaClient } from '../../generated/client/index.js';

let prisma: PrismaClient | null = null;

export function getSalesTeamPrisma(): PrismaClient {
  if (!prisma) {
    prisma = new PrismaClient();
  }
  return prisma;
}

export async function disconnectSalesTeamPrisma(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect();
    prisma = null;
  }
}
