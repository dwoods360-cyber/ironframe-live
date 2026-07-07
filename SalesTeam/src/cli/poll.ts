import { loadSalesTeamEnv } from '../loadSalesTeamEnv.js';
import { disconnectSalesTeamPrisma } from '../lib/prisma.js';
import { runPollCycle } from '../pipeline/runPollCycle.js';

loadSalesTeamEnv();

async function main(): Promise<void> {
  const result = await runPollCycle();
  console.log(
    JSON.stringify(
      {
        ok: !result.error,
        pollRunId: result.pollRunId,
        summary: result.summary,
        error: result.error,
        log: result.pipelineLog,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((err) => {
    console.error('[salesteam poll] failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectSalesTeamPrisma();
  });
