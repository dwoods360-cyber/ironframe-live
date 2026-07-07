import { getSupportTeamPrisma } from '../lib/prisma.js';
import { invokeSupportTeamPoll, type PollGraphResult } from '../graph/pipeline.js';

export type PollCycleResult = PollGraphResult & {
  pollRunId: string;
};

export async function runPollCycle(): Promise<PollCycleResult> {
  const prisma = getSupportTeamPrisma();
  const run = await prisma.pollRun.create({ data: {} });

  try {
    const result = await invokeSupportTeamPoll({ threadId: run.id });
    await prisma.pollRun.update({
      where: { id: run.id },
      data: {
        completedAt: new Date(),
        ticketsSeen: result.summary.ticketsSeen,
        newTickets: result.summary.newTickets,
        repliesQueued: result.summary.repliesQueued,
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
