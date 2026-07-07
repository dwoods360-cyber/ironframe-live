import { loadSupportTeamEnv } from '../loadSupportTeamEnv.js';
import { runPollCycle } from '../pipeline/runPollCycle.js';

loadSupportTeamEnv();

runPollCycle()
  .then((result) => {
    console.log(JSON.stringify({ ok: true, summary: result.summary }, null, 2));
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
