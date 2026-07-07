import express from 'express';

import {
  getPollIntervalMs,
  getSalesTeamPort,
  isPollEnabled,
  loadSalesTeamEnv,
} from './loadSalesTeamEnv.js';
import { disconnectSalesTeamPrisma } from './lib/prisma.js';
import { runPollCycle } from './pipeline/runPollCycle.js';

loadSalesTeamEnv();

const app = express();
app.use(express.json());

let pollInFlight = false;

app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'salesteam',
    status: 'HEALTHY',
    pollEnabled: isPollEnabled(),
    checkedAt: new Date().toISOString(),
  });
});

app.post('/poll', async (_req, res) => {
  if (pollInFlight) {
    res.status(409).json({ ok: false, error: 'POLL_ALREADY_RUNNING' });
    return;
  }
  pollInFlight = true;
  try {
    const result = await runPollCycle();
    res.json({ ok: true, summary: result.summary, pollRunId: result.pollRunId });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'poll failed';
    res.status(500).json({ ok: false, error: message });
  } finally {
    pollInFlight = false;
  }
});

async function scheduledPoll(): Promise<void> {
  if (!isPollEnabled() || pollInFlight) return;
  pollInFlight = true;
  try {
    const result = await runPollCycle();
    console.log(
      `[salesteam] poll complete — seen=${result.summary.prospectsSeen} new=${result.summary.newProspects} queued=${result.summary.draftsQueued}`,
    );
  } catch (err) {
    console.error('[salesteam] scheduled poll failed:', err);
  } finally {
    pollInFlight = false;
  }
}

const port = getSalesTeamPort();
const intervalMs = getPollIntervalMs();

const server = app.listen(port, () => {
  console.log(`[salesteam] worker listening on http://127.0.0.1:${port}`);
  if (isPollEnabled()) {
    console.log(`[salesteam] polling every ${intervalMs}ms`);
    void scheduledPoll();
    setInterval(() => void scheduledPoll(), intervalMs);
  } else {
    console.log('[salesteam] polling disabled — POST /poll to run manually');
  }
});

function shutdown(): void {
  server.close(() => {
    void disconnectSalesTeamPrisma().finally(() => process.exit(0));
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
