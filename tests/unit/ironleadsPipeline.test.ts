import { beforeEach, describe, expect, it } from 'vitest';

import { ironleadsApp, invokeIronleadsPipeline } from '@/Ironleads/src/graph/pipeline';
import { resetIronleadsScratchpad } from '../helpers/ironleadsTestHarness';

describe('ironleadsPipeline graph', () => {
  beforeEach(async () => {
    await resetIronleadsScratchpad();
  });
  it('compiles the linear scout → marshal micro-graph', () => {
    expect(ironleadsApp).toBeDefined();
    const graph = ironleadsApp.getGraph();
    expect(graph.nodes).toHaveProperty('scout');
    expect(graph.nodes).toHaveProperty('parser');
    expect(graph.nodes).toHaveProperty('scorer');
    expect(graph.nodes).toHaveProperty('strategist');
    expect(graph.nodes).toHaveProperty('marshal');
  });

  it('runs fixture harvest through the graph with ingress skipped', async () => {
    const result = await invokeIronleadsPipeline({
      sourceIds: ['ironleads_fixture_mssp'],
      skipIngress: true,
    });

    expect(result.pipelineLog.some(line => line.includes('[scout]'))).toBe(true);
    expect(result.pipelineLog.some(line => line.includes('[marshal] skipped'))).toBe(true);
    expect(result.summary.signalsFetched).toBeGreaterThanOrEqual(0);
  });
});
