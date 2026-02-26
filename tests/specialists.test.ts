import { describe, it, expect } from 'vitest';
import { createSovereignGraph } from '../src/services/orchestration/graph';
import { v4 as uuidv4 } from 'uuid';

const hasDatabase = Boolean(process.env.DATABASE_URL);

/**
 * SOVEREIGN TEST SUITE: Specialist Chain of Command
 * Mandate: Verify the 1-to-5-to-3 agent handover.
 */
describe('Sovereign Specialist Protocol', () => {
  it.skipIf(!hasDatabase)('📑 CHAIN REACTION: Ironscribe extracts and Irontrust audits', async () => {
    const graph = await createSovereignGraph();
    const testTraceId = uuidv4();

    // 1. Simulate a Raw Document Ingress
    const initialState = {
      tenant_id: uuidv4(),
      trace_id: testTraceId,
      raw_payload: {
        type: 'DOCUMENT_ANALYSIS',
        text: 'MOCK_DOC_CONTENT: Medshield Audit for Vendor-550e8400, Total 11100000.00'
      },
      status: 'PENDING' as const
    };

    const config = { configurable: { thread_id: testTraceId } };

    // 2. Execute the full Graph
    const result = await graph.invoke(initialState, config);

    // 3. Validation: The Handover
    // The status should be COMPLETED (set by Irontrust at the end of the chain)
    expect(result.status).toBe('COMPLETED');

    // 4. Validation: Audit Logs (The Evidence Trail)
    const logs = result.agent_logs;
    expect(logs.some(l => l.includes('Ironcore routed payload type [DOCUMENT_ANALYSIS]'))).toBe(true);
    expect(logs.some(l => l.includes('Ironscribe successfully extracted data'))).toBe(true);
    expect(logs.some(l => l.includes('Irontrust analyzed MEDSHIELD'))).toBe(true);

    // 5. Validation: Mathematical Accuracy
    // Ensure the final state contains the BIGINT variance calculated by Agent 3
    expect(logs.some(l => l.includes('Variance 0'))).toBe(true); // $11.1M - $11.1M = 0
  });
});
