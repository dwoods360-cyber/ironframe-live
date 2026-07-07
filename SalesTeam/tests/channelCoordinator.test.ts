import { describe, expect, it } from 'vitest';

import { routeProspectChannel } from '../src/agents/channelCoordinator.js';
import { planProspectCadence } from '../src/agents/cadencePlanner.js';

describe('channelCoordinator', () => {
  it('routes MSSP to partner email path', () => {
    const route = routeProspectChannel('MSSP_ENCLAVE', true, 'SMS');
    expect(route.partnerRoute).toBe(true);
    expect(route.channel).toBe('EMAIL');
  });

  it('plans accelerated cadence for high priority scores', () => {
    const plan = planProspectCadence(80, 'EMAIL');
    expect(plan.followUpDelayHours).toBe(48);
    expect(plan.maxTouches).toBe(3);
  });
});
