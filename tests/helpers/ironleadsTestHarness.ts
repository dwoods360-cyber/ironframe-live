import { getIronleadsPrisma } from '@/Ironleads/src/lib/prisma';
import { loadIronleadsEnv } from '@/Ironleads/src/loadIronleadsEnv';

/** Clear volatile Ironleads SQLite scratchpad between graph integration tests. */
export async function resetIronleadsScratchpad(): Promise<void> {
  loadIronleadsEnv();
  const prisma = getIronleadsPrisma();
  await prisma.$transaction([
    prisma.quarantineLead.deleteMany(),
    prisma.qualifiedLead.deleteMany(),
    prisma.rawScrapedSignal.deleteMany(),
    prisma.harvestRun.deleteMany(),
  ]);
}
