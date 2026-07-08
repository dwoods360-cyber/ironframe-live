/**
 * Ironleads — autonomous OSINT lead harvester (out-of-process from Ironframe).
 * Agents (LangGraph): scout → parser → scorer → strategist → marshal
 */
import express from 'express';
import { execSync } from 'node:child_process';

import { IRONLEADS_KNOWLEDGE_MANIFEST } from './knowledge/index.js';
import { ironleadsApp } from './graph/pipeline.js';
import { getIronleadsPort, isHarvestCronEnabled, loadIronleadsEnv } from './loadIronleadsEnv.js';
import { disconnectIronleadsPrisma } from './lib/prisma.js';
import { runHarvestCycle } from './pipeline/runHarvestCycle.js';
import { executeLeadGenKnowledgeTool } from './tools/leadGenKnowledgeTools.js';

loadIronleadsEnv();

function ensureSqliteSchema(): void {
  execSync('npm run db:push', { stdio: 'inherit', env: process.env });
}

ensureSqliteSchema();

const app = express();
app.use(express.json({ limit: '1mb' }));

const HARVEST_INTERVAL_MS = 60 * 60 * 1000;
let harvestInFlight = false;

app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'ironleads',
    port: getIronleadsPort(),
    corpusId: IRONLEADS_KNOWLEDGE_MANIFEST.corpusId,
    harvestCronEnabled: isHarvestCronEnabled(),
    pipeline: ['scout', 'parser', 'scorer', 'strategist', 'marshal', 'quarantine_dlq'],
    recovery: 'last-known-good',
    graph: 'langgraph-linear',
    checkpoint: 'sqlite',
  });
});

app.get('/api/pipeline', (_req, res) => {
  res.json({
    ok: true,
    nodes: ironleadsApp.getGraph().nodes,
    edges: [
      ['__start__', 'scout'],
      ['scout', 'parser'],
      ['parser', 'scorer'],
      ['scorer', 'strategist'],
      ['strategist', 'marshal'],
      ['marshal', '__end__'],
      ['quarantine_dlq', '__end__'],
    ],
  });
});

app.get('/api/knowledge', async (req, res) => {
  const result = await executeLeadGenKnowledgeTool({
    action: 'list_leadgen_knowledge',
    category: req.query.category,
    kind: req.query.kind,
    beachheadSector: req.query.beachheadSector,
    trigger: req.query.trigger,
    searchQuery: req.query.q,
    limit: req.query.limit,
  });
  res.json(result);
});

app.get('/api/knowledge/:id', async (req, res) => {
  const result = await executeLeadGenKnowledgeTool({
    action: 'get_leadgen_entry',
    knowledgeId: req.params.id,
  });
  res.status(result.ok ? 200 : 404).json(result);
});

app.post('/api/harvest', async (req, res) => {
  if (harvestInFlight) {
    res.status(409).json({ ok: false, error: 'Harvest cycle already running' });
    return;
  }
  harvestInFlight = true;
  try {
    const sourceIds = Array.isArray(req.body?.sourceIds)
      ? req.body.sourceIds.map(String)
      : undefined;
    const result = await runHarvestCycle({
      sourceIds,
      scoutOnly: Boolean(req.body?.scoutOnly),
      skipIngress: Boolean(req.body?.skipIngress),
    });
    res.json({ ok: true, ...result });
  } catch (err) {
    res.status(500).json({
      ok: false,
      error: err instanceof Error ? err.message : 'Harvest failed',
    });
  } finally {
    harvestInFlight = false;
  }
});

async function scheduledHarvest(): Promise<void> {
  if (!isHarvestCronEnabled() || harvestInFlight) return;
  harvestInFlight = true;
  try {
    await runHarvestCycle({ sourceIds: ['ironleads_fixture_regional_bhc', 'ironleads_fixture_mssp'] });
  } catch (err) {
    console.error('[Ironleads] scheduled harvest error:', err);
  } finally {
    harvestInFlight = false;
  }
}

const port = getIronleadsPort();
app.listen(port, () => {
  console.log(`[Ironleads] listening on http://127.0.0.1:${port}`);
  if (isHarvestCronEnabled()) {
    console.log('[Ironleads] harvest cron enabled — hourly fixture cycle');
    void scheduledHarvest();
    setInterval(() => {
      void scheduledHarvest();
    }, HARVEST_INTERVAL_MS);
  }
});

process.on('SIGINT', () => {
  void disconnectIronleadsPrisma().finally(() => process.exit(0));
});

process.on('SIGTERM', () => {
  void disconnectIronleadsPrisma().finally(() => process.exit(0));
});
