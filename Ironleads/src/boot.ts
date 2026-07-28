/**
 * Cloud Run boot: bind 0.0.0.0:$PORT before any sqlite/FUSE/LangGraph work.
 */
import express from 'express';

import { bootState } from './bootState.js';

const LISTEN_HOST = '0.0.0.0';
const port = Number.parseInt(process.env.PORT?.trim() || '8083', 10) || 8083;

const app = express();

app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'ironleads',
    status: bootState.status,
    bootError: bootState.error,
    listenHost: LISTEN_HOST,
    port,
    ...bootState.details,
  });
});

const server = app.listen(port, LISTEN_HOST, () => {
  console.log(`[Ironleads] boot listener on http://${LISTEN_HOST}:${port}`);
  void import('./runtime.js')
    .then(async ({ startIronleadsRuntime }) => {
      await startIronleadsRuntime(app);
    })
    .catch((err) => {
      bootState.status = 'DEGRADED';
      bootState.error = err instanceof Error ? err.message : String(err);
      console.error('[Ironleads] runtime failed after listen:', bootState.error);
    });
});

function shutdown(): void {
  server.close(() => process.exit(0));
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
