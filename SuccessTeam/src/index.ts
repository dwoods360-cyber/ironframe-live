import express from 'express';
import { execSync } from 'node:child_process';

import { loadSuccessTeamEnv, getSuccessTeamPort, getPollIntervalMs, isPollEnabled } from './loadSuccessTeamEnv.js';
import { runPollCycle } from './pipeline/runPollCycle.js';

loadSuccessTeamEnv();

const LISTEN_HOST = '0.0.0.0';
const SCHEMA_PUSH_TIMEOUT_MS = 90_000;

let schemaReady = false;
let schemaError: string | null = null;

function ensureSqliteSchema(): void {
  execSync('npm run db:push', {
    stdio: 'inherit',
    env: process.env,
    timeout: SCHEMA_PUSH_TIMEOUT_MS,
  });
}

const app = express();
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'successteam',
    brand: 'IronSuccessTeam',
    status: schemaReady ? 'HEALTHY' : schemaError ? 'DEGRADED' : 'STARTING',
    schemaReady,
    schemaError,
    listenHost: LISTEN_HOST,
  });
});

app.post('/poll', async (_req, res) => {
  if (!schemaReady) {
    res.status(503).json({ ok: false, error: 'Schema not ready', schemaError });
    return;
  }
  try {
    const result = await runPollCycle();
    res.json({ ok: true, pollRunId: result.pollRunId, summary: result.summary });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'poll failed';
    res.status(500).json({ ok: false, error: message });
  }
});

async function scheduledPoll(): Promise<void> {
  if (!schemaReady) return;
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
let pollTimer: ReturnType<typeof setInterval> | null = null;

function startPollCron(): void {
  if (!polling || pollTimer) return;
  console.log(`[successteam] polling every ${intervalMs}ms`);
  void scheduledPoll();
  pollTimer = setInterval(() => void scheduledPoll(), intervalMs);
}

const server = app.listen(port, LISTEN_HOST, () => {
  console.log(`[successteam] worker listening on http://${LISTEN_HOST}:${port}`);
  try {
    ensureSqliteSchema();
    schemaReady = true;
    schemaError = null;
    console.log('[successteam] sqlite schema ready');
    if (polling) {
      startPollCron();
    } else {
      console.log('[successteam] polling disabled — POST /poll to run manually');
    }
  } catch (err) {
    schemaReady = false;
    schemaError = err instanceof Error ? err.message : 'db:push failed';
    console.error('[successteam] sqlite schema push failed after listen:', schemaError);
  }
});

process.on('SIGINT', () => {
  if (pollTimer) clearInterval(pollTimer);
  server.close(() => process.exit(0));
});
process.on('SIGTERM', () => {
  if (pollTimer) clearInterval(pollTimer);
  server.close(() => process.exit(0));
});
