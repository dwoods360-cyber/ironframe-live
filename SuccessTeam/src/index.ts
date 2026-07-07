import express from 'express';

import { loadSuccessTeamEnv, getSuccessTeamPort, getPollIntervalMs, isPollEnabled } from './loadSuccessTeamEnv.js';
import { runPollCycle } from './pipeline/runPollCycle.js';

loadSuccessTeamEnv();

const app = express();
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'successteam', brand: 'IronSuccessTeam' });
});

app.post('/poll', async (_req, res) => {
  try {
    const result = await runPollCycle();
    res.json({ ok: true, pollRunId: result.pollRunId, summary: result.summary });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'poll failed';
    res.status(500).json({ ok: false, error: message });
  }
});

async function scheduledPoll(): Promise<void> {
  try {
    const result = await runPollCycle();
    console.log(
      `[successteam] poll complete — seen=${result.summary.accountsSeen} new=${result.summary.newAccounts} queued=${result.summary.advisoriesQueued}`,
    );
  } catch (err) {
    console.error('[successteam] scheduled poll failed:', err);
  }
}

const port = getSuccessTeamPort();
const intervalMs = getPollIntervalMs();
const polling = isPollEnabled();

app.listen(port, () => {
  console.log(`[successteam] worker listening on http://127.0.0.1:${port}`);
  if (polling) {
    console.log(`[successteam] polling every ${intervalMs}ms`);
    void scheduledPoll();
    setInterval(() => void scheduledPoll(), intervalMs);
  } else {
    console.log('[successteam] polling disabled — POST /poll to run manually');
  }
});
