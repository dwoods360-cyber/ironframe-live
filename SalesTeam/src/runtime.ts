import type { Express } from 'express';
import express from 'express';
import { execSync } from 'node:child_process';

import { bootState } from './bootState.js';
import {
  getPollIntervalMs,
  isPollEnabled,
  loadSalesTeamEnv,
} from './loadSalesTeamEnv.js';
import { disconnectSalesTeamPrisma } from './lib/prisma.js';
import { runPollCycle } from './pipeline/runPollCycle.js';

const SCHEMA_PUSH_TIMEOUT_MS = 90_000;

let schemaReady = false;
let schemaError: string | null = null;
let pollInFlight = false;
let pollTimer: ReturnType<typeof setInterval> | null = null;

function ensureSqliteSchema(): void {
  execSync('npm run db:push', {
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

async function scheduledPoll(): Promise<void> {
  if (!isPollEnabled() || !schemaReady || pollInFlight) return;
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

function startPollCron(): void {
  if (!isPollEnabled() || pollTimer) return;
  const intervalMs = getPollIntervalMs();
  console.log(`[salesteam] polling every ${intervalMs}ms`);
  void scheduledPoll();
  pollTimer = setInterval(() => void scheduledPoll(), intervalMs);
}

export async function startSalesTeamRuntime(app: Express): Promise<void> {
  bootState.status = 'STARTING';
  loadSalesTeamEnv();
  app.use(express.json());

  app.post('/poll', async (_req, res) => {
    if (!schemaReady) {
      res.status(503).json({ ok: false, error: 'Schema not ready', schemaError });
      return;
    }
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

  try {
    ensureSqliteSchema();
    schemaReady = true;
    schemaError = null;
    console.log('[salesteam] sqlite schema ready');
    if (isPollEnabled()) {
      startPollCron();
    } else {
      console.log('[salesteam] polling disabled — POST /poll to run manually');
    }
  } catch (err) {
    schemaReady = false;
    schemaError = err instanceof Error ? err.message : 'db:push failed';
    console.error('[salesteam] sqlite schema push failed:', schemaError);
  }

  publishHealth();

  const shutdown = (): void => {
    if (pollTimer) clearInterval(pollTimer);
    void disconnectSalesTeamPrisma().finally(() => process.exit(0));
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}
