import express from 'express';

import { bootState } from './bootState.js';

const LISTEN_HOST = '0.0.0.0';
const port = Number.parseInt(process.env.PORT?.trim() || '8085', 10) || 8085;

const app = express();

app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'successteam',
    brand: 'IronSuccessTeam',
    status: bootState.status,
    bootError: bootState.error,
    listenHost: LISTEN_HOST,
    port,
    ...bootState.details,
  });
});

const server = app.listen(port, LISTEN_HOST, () => {
  console.log(`[successteam] boot listener on http://${LISTEN_HOST}:${port}`);
  void import('./runtime.js')
    .then(async ({ startSuccessTeamRuntime }) => {
      await startSuccessTeamRuntime(app);
    })
    .catch((err) => {
      bootState.status = 'DEGRADED';
      bootState.error = err instanceof Error ? err.message : String(err);
      console.error('[successteam] runtime failed after listen:', bootState.error);
    });
});

function shutdown(): void {
  server.close(() => process.exit(0));
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
