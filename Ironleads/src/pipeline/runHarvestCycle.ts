import { getIronleadsPrisma } from '../lib/prisma.js';
import { loadIronleadsEnv } from '../loadIronleadsEnv.js';
import { invokeIronleadsPipeline } from '../graph/pipeline.js';

loadIronleadsEnv();

export type HarvestCycleResult = Awaited<ReturnType<typeof invokeIronleadsPipeline>> & {
  runId: string;
};

/** Harvest cycle — LangGraph linear micro-graph (scout → parser → scorer → strategist → marshal). */
export async function runHarvestCycle(options?: {
  sourceIds?: string[];
  scoutOnly?: boolean;
  skipIngress?: boolean;
}): Promise<HarvestCycleResult> {
  const prisma = getIronleadsPrisma();
  const run = await prisma.harvestRun.create({ data: {} });

  try {
    const graphResult = await invokeIronleadsPipeline({
      sourceIds: options?.sourceIds,
      scoutOnly: options?.scoutOnly,
      skipIngress: options?.skipIngress,
      threadId: run.id,
    });

    await prisma.harvestRun.update({
      where: { id: run.id },
      data: {
        completedAt: new Date(),
        signalsFetched: graphResult.summary.signalsFetched,
        qualified: graphResult.summary.qualified,
        shipped: graphResult.summary.shipped,
        dropped: graphResult.summary.dropped,
      },
    });

    return { ...graphResult, runId: run.id };
  } catch (err) {
    await prisma.harvestRun.update({
      where: { id: run.id },
      data: {
        completedAt: new Date(),
        errorMessage: err instanceof Error ? err.message : 'Harvest cycle failed',
      },
    });
    throw err;
  }
}

export { ironleadsApp, ironleadsPipeline, invokeIronleadsPipeline } from '../graph/pipeline.js';
