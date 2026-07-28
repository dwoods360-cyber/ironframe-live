import type { Express } from 'express';
import express from 'express';
import { execSync } from 'node:child_process';

import { bootState } from './bootState.js';
import {
  getPollIntervalMs,
  isPollEnabled,
  loadSupportTeamEnv,
} from './loadSupportTeamEnv.js';

const SCHEMA_PUSH_TIMEOUT_MS = 240_000;

let schemaReady = false;
let schemaError: string | null = null;
let pollInFlight = false;
let pollTimer: ReturnType<typeof setInterval> | null = null;

function ensureSqliteSchema(): void {
  execSync('npx prisma db push --schema prisma/schema.prisma --skip-generate', {
    stdio: 'inherit',
    env: process.env,
    timeout: SCHEMA_PUSH_TIMEOUT_MS,
  });
}

function publishHealth(): void {
  bootState.status = schemaReady ? 'HEALTHY' : schemaError ? 'DEGRADED' : 'STARTING';
  bootState.error = schemaError;
  bootState.details = {
    schemaReady,
    schemaError,
    pollEnabled: isPollEnabled(),
    checkedAt: new Date().toISOString(),
  };
}

async function loadRunPollCycle() {
  const mod = await import('./pipeline/runPollCycle.js');
  return mod.runPollCycle;
}

async function scheduledPoll(): Promise<void> {
  if (!schemaReady || pollInFlight) return;
  pollInFlight = true;
  try {
    const runPollCycle = await loadRunPollCycle();
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

function startPollCron(): void {
  if (!isPollEnabled() || pollTimer) return;
  const intervalMs = getPollIntervalMs();
  console.log(`[supportteam] polling every ${intervalMs}ms`);
  void scheduledPoll();
  pollTimer = setInterval(() => void scheduledPoll(), intervalMs);
}

export async function startSupportTeamRuntime(app: Express): Promise<void> {
  bootState.status = 'STARTING';
  loadSupportTeamEnv();
  app.use(express.json());

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
      const runPollCycle = await loadRunPollCycle();
      const result = await runPollCycle();
      res.json({ ok: true, pollRunId: result.pollRunId, summary: result.summary });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'poll failed';
      res.status(500).json({ ok: false, error: message });
    } finally {
      pollInFlight = false;
    }
  });

  try {
    ensureSqliteSchema();
    schemaReady = true;
    schemaError = null;
    console.log('[supportteam] sqlite schema ready');
    if (isPollEnabled()) {
      startPollCron();
    } else {
      console.log('[supportteam] polling disabled — POST /poll to run manually');
    }
  } catch (err) {
    schemaReady = false;
    schemaError = err instanceof Error ? err.message : 'db:push failed';
    console.error('[supportteam] sqlite schema push failed:', schemaError);
  }

  publishHealth();

  const shutdown = (): void => {
    if (pollTimer) clearInterval(pollTimer);
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}
