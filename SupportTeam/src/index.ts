import express from 'express';

import {
  getPollIntervalMs,
  getSupportTeamPort,
  isPollEnabled,
  loadSupportTeamEnv,
} from './loadSupportTeamEnv.js';
import { runPollCycle } from './pipeline/runPollCycle.js';

loadSupportTeamEnv();

const app = express();
app.use(express.json());

let pollInFlight = false;

app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'supportteam',
    brand: 'IronSupportTeam',
    status: 'HEALTHY',
    pollEnabled: isPollEnabled(),
    checkedAt: new Date().toISOString(),
  });
});

app.post('/poll', async (_req, res) => {
  if (pollInFlight) {
    res.status(409).json({ ok: false, error: 'poll already in flight' });
    return;
  }
  pollInFlight = true;
  try {
    const result = await runPollCycle();
    res.json({ ok: true, pollRunId: result.pollRunId, summary: result.summary });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'poll failed';
    res.status(500).json({ ok: false, error: message });
  } finally {
    pollInFlight = false;
  }
});

async function scheduledPoll(): Promise<void> {
  if (pollInFlight) return;
  pollInFlight = true;
  try {
    const result = await runPollCycle();
    console.log(
      `[supportteam] poll complete — seen=${result.summary.ticketsSeen} new=${result.summary.newTickets} queued=${result.summary.repliesQueued}`,
    );
  } catch (err) {
    console.error('[supportteam] scheduled poll failed:', err);
  } finally {
    pollInFlight = false;
  }
}

const port = getSupportTeamPort();
const intervalMs = getPollIntervalMs();
const polling = isPollEnabled();

app.listen(port, () => {
  console.log(`[supportteam] worker listening on http://127.0.0.1:${port}`);
  if (polling) {
    console.log(`[supportteam] polling every ${intervalMs}ms`);
    void scheduledPoll();
    setInterval(() => void scheduledPoll(), intervalMs);
  } else {
    console.log('[supportteam] polling disabled — POST /poll to run manually');
  }
});
