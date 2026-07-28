import express from 'express';
import { execSync } from 'node:child_process';

import {
  getPollIntervalMs,
  getSupportTeamPort,
  isPollEnabled,
  loadSupportTeamEnv,
} from './loadSupportTeamEnv.js';
import { runPollCycle } from './pipeline/runPollCycle.js';

loadSupportTeamEnv();

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

let pollInFlight = false;
let pollTimer: ReturnType<typeof setInterval> | null = null;

app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'supportteam',
    brand: 'IronSupportTeam',
    status: schemaReady ? 'HEALTHY' : schemaError ? 'DEGRADED' : 'STARTING',
    schemaReady,
    schemaError,
    listenHost: LISTEN_HOST,
    pollEnabled: isPollEnabled(),
    checkedAt: new Date().toISOString(),
  });
});

app.post('/poll', async (_req, res) => {
  if (!schemaReady) {
    res.status(503).json({ ok: false, error: 'Schema not ready', schemaError });
    return;
  }
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
  if (!schemaReady || pollInFlight) return;
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

function startPollCron(): void {
  if (!polling || pollTimer) return;
  console.log(`[supportteam] polling every ${intervalMs}ms`);
  void scheduledPoll();
  pollTimer = setInterval(() => void scheduledPoll(), intervalMs);
}

const server = app.listen(port, LISTEN_HOST, () => {
  console.log(`[supportteam] worker listening on http://${LISTEN_HOST}:${port}`);
  try {
    ensureSqliteSchema();
    schemaReady = true;
    schemaError = null;
    console.log('[supportteam] sqlite schema ready');
    if (polling) {
      startPollCron();
    } else {
      console.log('[supportteam] polling disabled — POST /poll to run manually');
    }
  } catch (err) {
    schemaReady = false;
    schemaError = err instanceof Error ? err.message : 'db:push failed';
    console.error('[supportteam] sqlite schema push failed after listen:', schemaError);
  }
});

function shutdown(): void {
  if (pollTimer) clearInterval(pollTimer);
  server.close(() => process.exit(0));
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
