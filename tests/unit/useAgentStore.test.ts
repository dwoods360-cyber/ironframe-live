/**
 * Unit tests: useAgentStore — CLI & Agent Visualization (GATEKEEPER PROTOCOL).
 * Codifies agent state machine behavior: terminal log, Kimbot trigger, agent pulse (green/warning).
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useAgentStore } from '@/app/store/agentStore';
import type { AgentKey } from '@/app/store/agentStore';

const INITIAL_STREAM = [
  '> [SYSTEM] System Online. Core Vault synced.',
  '> [SYSTEM] Zero-trust Architecture enforced.',
];

function resetAgentStore() {
  useAgentStore.setState({
    agents: {
      ironsight: { status: 'HEALTHY' },
      coreintel: { status: 'HEALTHY' },
      agentManager: { status: 'HEALTHY' },
    },
    intelligenceStream: [...INITIAL_STREAM],
    systemLatencyMs: null,
  });
}

describe('useAgentStore - CLI & Agent Visualization', () => {
  beforeEach(() => {
    resetAgentStore();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('Test 1 - Initialization: store initializes with default terminal log and agent statuses (idle/standby)', () => {
    resetAgentStore();
    const state = useAgentStore.getState();

    expect(state.intelligenceStream).toEqual(INITIAL_STREAM);
    expect(state.intelligenceStream.length).toBe(2);
    expect(state.systemLatencyMs).toBeNull();

    const agents: AgentKey[] = ['ironsight', 'coreintel', 'agentManager'];
    agents.forEach((key) => {
      expect(state.agents[key]).toBeDefined();
      expect(state.agents[key].status).toBe('HEALTHY');
    });
  });

  it('Test 2 - Kimbot Trigger (The "START" Log): kimbot CLI action adds initialization log to terminal', () => {
    const startMessage = '> [SYSTEM] KIMBOT START — Red Team data generator online.';
    useAgentStore.getState().addStreamMessage(startMessage);

    const stream = useAgentStore.getState().intelligenceStream;
    expect(stream[0]).toBe(startMessage);
    expect(stream.some((msg) => msg.includes('KIMBOT') && msg.includes('START'))).toBe(true);
  });

  it('Test 3 - Agent Pulse (State Update): setAgentStatus flips agents to PROCESSING (green pulse) and WARNING (threat/red)', () => {
    const { setAgentStatus } = useAgentStore.getState();

    setAgentStatus('ironsight', 'PROCESSING');
    setAgentStatus('coreintel', 'PROCESSING');
    expect(useAgentStore.getState().agents.ironsight.status).toBe('PROCESSING');
    expect(useAgentStore.getState().agents.coreintel.status).toBe('PROCESSING');
    expect(useAgentStore.getState().agents.agentManager.status).toBe('HEALTHY');

    setAgentStatus('ironsight', 'WARNING');
    expect(useAgentStore.getState().agents.ironsight.status).toBe('WARNING');

    setAgentStatus('coreintel', 'ACTIVE_DEFENSE');
    expect(useAgentStore.getState().agents.coreintel.status).toBe('ACTIVE_DEFENSE');
  });
});
