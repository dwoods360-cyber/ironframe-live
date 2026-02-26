import { describe, it, expect } from 'vitest';
import { v4 as uuidv4 } from 'uuid';

const hasLiveEnv = Boolean(process.env.GOOGLE_API_KEY && process.env.DATABASE_URL);

/**
 * SOVEREIGN TEST SUITE: Live Fire (Gemini + Warden + Irontrust)
 * Mandate: Verify physical LLM output passes through Agent 12 Guardrails.
 */
describe('Sovereign Live Fire Protocol', () => {
  it.skipIf(!hasLiveEnv)('🔥 LIVE FIRE: Gemini extracts, Warden validates, Irontrust audits', async () => {
    // Dynamic import so we don't load graph/Ironscribe (and thus Gemini client) when env is missing
    const { createSovereignGraph } = await import('../src/services/orchestration/graph');
    const graph = await createSovereignGraph();
    const testTraceId = uuidv4();

    // 1. Input: Real, messy text simulating a Medshield document
    const initialState = {
      tenant_id: uuidv4(),
      trace_id: testTraceId,
      raw_payload: {
        type: 'DOCUMENT_ANALYSIS',
        text: 'CONFIDENTIAL: This audit for Medshield (Tenant Type: MEDSHIELD) confirms a total liability of $11,100,000.00. Vendor ID is 550e8400-e29b-41d4-a716-446655440000.'
      },
      status: 'PENDING' as const
    };

    const config = { configurable: { thread_id: testTraceId } };

    // 2. Execute the physical LLM chain
    // NOTE: This requires a valid GOOGLE_API_KEY in your .env
    const result = await graph.invoke(initialState, config);

    // 3. Validation: The Warden's Stamp
    const logs = result.agent_logs;
    expect(logs.some(l => l.includes('WARDEN: Mathematical integrity verified'))).toBe(true);

    // 4. Validation: Logical Accuracy
    // Ensure Gemini correctly converted $11.1M to 1.11B cents
    expect(result.raw_payload.amount_cents).toBe(1110000000);
    expect(result.status).toBe('COMPLETED');

    // 5. Validation: Mathematical Result
    expect(logs.some(l => l.includes('Variance 0'))).toBe(true);
  }, 30000); // Extended timeout for physical LLM latency
});
