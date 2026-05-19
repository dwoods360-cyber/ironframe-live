import { describe, it, expect } from 'vitest';
import { v4 as uuidv4 } from 'uuid';

const hasDatabase = Boolean(process.env.DATABASE_URL);

/**
 * SOVEREIGN TEST SUITE: Core Orchestration (The Brain & Memory)
 * Mandate: Every audit must be routable and checkpointed.
 */
describe('Sovereign Orchestration Protocol', () => {
  it.skipIf(!hasDatabase)('🧠 ROUND-TRIP: Ironcore routes and Irontech checkpoints', async () => {
    const { createSovereignGraph } = await import('../src/services/orchestration/graph');
    const graph = await createSovereignGraph();
    const testTenantId = uuidv4(); // Unique UUID for this test run
    const testTraceId = uuidv4();

    // 1. Simulate a Clean Payload from Irongate
    const initialState = {
      tenant_id: testTenantId,
      trace_id: testTraceId,
      raw_payload: { type: 'FINANCIAL_AUDIT', amount_cents: 1110000000 }, // Medshield Baseline
      status: 'PENDING' as const
    };

    // 2. Execute the Graph with Checkpointing enabled
    // The "thread_id" tells Agent 11 where to save the memory
    const config = { configurable: { thread_id: testTraceId } };
    const result = await graph.invoke(initialState, config);

    // 3. Validation: Routing
    // Since we only have Ironcore built, it should route to IRONTRUST then stop (for now)
    expect(result.current_agent).toBe('IRONTRUST');
    expect(result.agent_logs[0]).toContain('Ironcore routed payload type [FINANCIAL_AUDIT] to IRONTRUST');

    // 4. Validation: Persistence
    // Retrieve the state back FROM the checkpointer to prove it saved to PostgreSQL
    const stateFromMemory = await graph.getState(config);
    expect(stateFromMemory.values.tenant_id).toBe(testTenantId);
    expect(stateFromMemory.values.status).toBe('PROCESSING');
  });

  it.skipIf(!hasDatabase)('🔒 FREEZE: executeAutonomousStateFreeze resolves Postgres checkpoint', async () => {
    const { createSovereignGraph, executeAutonomousStateFreeze } = await import(
      '../src/services/orchestration/graph'
    );
    const graph = await createSovereignGraph();
    const testTenantId = uuidv4();
    const testTraceId = uuidv4();

    await graph.invoke(
      {
        tenant_id: testTenantId,
        raw_payload: { type: 'FINANCIAL_AUDIT', amount_cents: 1110000000 },
        status: 'PENDING' as const,
      },
      { configurable: { thread_id: testTraceId } },
    );

    const freeze = await executeAutonomousStateFreeze(testTraceId, testTenantId);
    expect(freeze.status).toBe('OPERATIONAL_FREEZE_LOCKED');
    expect(freeze.checkpointId).toBeTruthy();
    expect(freeze.threadId).toBe(testTraceId);
    expect(freeze.tenantId).toBe(testTenantId);
  });
});
