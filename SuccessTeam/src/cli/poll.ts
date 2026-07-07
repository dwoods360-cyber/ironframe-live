import '../loadSuccessTeamEnv.js';

import { runPollCycle } from '../pipeline/runPollCycle.js';

runPollCycle()
  .then((result) => {
    console.log(
      JSON.stringify({
        ok: true,
        pollRunId: result.pollRunId,
        summary: result.summary,
      }),
    );
    process.exit(0);
  })
  .catch((err) => {
    console.error('[successteam poll] failed:', err);
    process.exit(1);
  });
