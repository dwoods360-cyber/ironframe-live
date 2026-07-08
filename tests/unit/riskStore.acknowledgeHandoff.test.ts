/**
 * Unit tests: optimistic pipeline → active handoff on acknowledge.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/app/actions/threatActions', () => ({
  acknowledgeThreatAction: vi.fn(),
}));

vi.mock('@/app/utils/auditLogger', () => ({
  appendAuditLog: vi.fn(),
}));

import { acknowledgeThreatAction } from '@/app/actions/threatActions';
import { useRiskStore } from '@/app/store/riskStore';

describe('riskStore — acknowledge optimistic handoff', () => {
  beforeEach(() => {
    useRiskStore.setState({
      pipelineThreats: [
        {
          id: 'threat-ack-1',
          name: 'E2E Ack Unit',
          loss: 2,
          score: 5,
          industry: 'Healthcare',
          source: 'E2E',
          description: 'test',
          lifecycleState: 'pipeline',
        },
      ],
      activeThreats: [],
      threatIndexById: {},
      ackInFlightThreatIds: {},
      threatActionError: { active: false, message: '' },
    });
    vi.mocked(acknowledgeThreatAction).mockReset();
  });

  it('acceptPipelineThreat moves card off pipeline immediately', () => {
    useRiskStore.getState().acceptPipelineThreat('threat-ack-1');
    const state = useRiskStore.getState();
    expect(state.pipelineThreats.some((t) => t.id === 'threat-ack-1')).toBe(false);
    expect(state.activeThreats.some((t) => t.id === 'threat-ack-1')).toBe(true);
  });

  it('revertAcceptedPipelineThreat restores pipeline card after failed ack', () => {
    useRiskStore.getState().acceptPipelineThreat('threat-ack-1');
    useRiskStore.getState().revertAcceptedPipelineThreat('threat-ack-1');
    const state = useRiskStore.getState();
    expect(state.pipelineThreats.some((t) => t.id === 'threat-ack-1')).toBe(true);
    expect(state.activeThreats.some((t) => t.id === 'threat-ack-1')).toBe(false);
  });

  it('acknowledgeThreat applies local handoff before background board pulse', async () => {
    let pulseStarted = false;
    vi.mocked(acknowledgeThreatAction).mockImplementation(async () => {
      await new Promise((r) => setTimeout(r, 50));
      return { success: true as const };
    });

    const store = useRiskStore.getState();
    const originalPulse = store.pulseThreatBoardsFromDb;
    useRiskStore.setState({
      pulseThreatBoardsFromDb: async () => {
        pulseStarted = true;
        await originalPulse();
      },
    });

    useRiskStore.getState().acceptPipelineThreat('threat-ack-1');
    const ackPromise = useRiskStore
      .getState()
      .acknowledgeThreat('threat-ack-1', 'op-1', 'x'.repeat(50), 'tenant-uuid');

    const mid = useRiskStore.getState();
    expect(mid.activeThreats.some((t) => t.id === 'threat-ack-1')).toBe(true);
    expect(mid.pipelineThreats.some((t) => t.id === 'threat-ack-1')).toBe(false);
    expect(pulseStarted).toBe(false);

    await ackPromise;
    expect(useRiskStore.getState().activeThreats.some((t) => t.id === 'threat-ack-1')).toBe(true);
  });
});
