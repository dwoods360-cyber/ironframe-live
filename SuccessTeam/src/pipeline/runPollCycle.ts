import { getSuccessTeamPrisma } from '../lib/prisma.js';
import { invokeSuccessTeamPoll, type PollGraphResult } from '../graph/pipeline.js';

export type PollCycleResult = PollGraphResult & {
  pollRunId: string;
};

export async function runPollCycle(): Promise<PollCycleResult> {
  const prisma = getSuccessTeamPrisma();
  const run = await prisma.pollRun.create({ data: {} });

  try {
    const result = await invokeSuccessTeamPoll({ threadId: run.id });
    await prisma.pollRun.update({
      where: { id: run.id },
      data: {
        completedAt: new Date(),
        accountsSeen: result.summary.accountsSeen,
        newAccounts: result.summary.newAccounts,
        advisoriesQueued: result.summary.advisoriesQueued,
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
