import { getSalesTeamPrisma } from '../lib/prisma.js';
import { invokeSalesTeamPoll, type PollGraphResult } from '../graph/pipeline.js';

export type PollCycleResult = PollGraphResult & {
  pollRunId: string;
};

export async function runPollCycle(): Promise<PollCycleResult> {
  const prisma = getSalesTeamPrisma();
  const run = await prisma.pollRun.create({ data: {} });

  try {
    const result = await invokeSalesTeamPoll({ threadId: run.id });
    await prisma.pollRun.update({
      where: { id: run.id },
      data: {
        completedAt: new Date(),
        prospectsSeen: result.summary.prospectsSeen,
        newProspects: result.summary.newProspects,
        draftsQueued: result.summary.draftsQueued,
        failed: result.summary.failed,
        errorMessage: result.error,
      },
    });
    return { ...result, pollRunId: run.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'poll cycle failed';
    await prisma.pollRun.update({
      where: { id: run.id },
      data: {
        completedAt: new Date(),
        errorMessage: message,
      },
    });
    throw err;
  }
}
