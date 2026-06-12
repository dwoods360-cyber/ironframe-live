import { describe, expect, it } from 'vitest';
import {
  IRONBOARD_ENDPOINTS,
  IRONBOARD_PORT,
  IRONFRAME_ENDPOINTS,
  IRONFRAME_PORT,
  ZERO_CROSS_CONTAMINATION_DIRECTIVE,
  isIronboardEndpoint,
  isIronframeEndpoint,
  resolveApplicationContext,
} from '../../lib/platformApplicationBoundary';

describe('platformApplicationBoundary', () => {
  it('registers Ironframe and IronBoard endpoint matrices', () => {
    expect(IRONFRAME_PORT).toBe(3000);
    expect(IRONBOARD_PORT).toBe(8082);
    expect(IRONFRAME_ENDPOINTS).toContain('/vendors');
    expect(IRONFRAME_ENDPOINTS).toContain('/quarantine');
    expect(IRONBOARD_ENDPOINTS).toContain('/board-report');
    expect(IRONBOARD_ENDPOINTS).toContain('/opsupport');
  });

  it('resolves application context from pathname and port', () => {
    expect(resolveApplicationContext({ pathname: '/vendors' })).toBe('ironframe');
    expect(resolveApplicationContext({ pathname: '/board-report' })).toBe('ironboard');
    expect(resolveApplicationContext({ port: 3000 })).toBe('ironframe');
    expect(resolveApplicationContext({ port: 8082 })).toBe('ironboard');
  });

  it('classifies nested routes under registered endpoints', () => {
    expect(isIronframeEndpoint('/vault/seal')).toBe(true);
    expect(isIronboardEndpoint('/opsupport/chaos')).toBe(true);
    expect(isIronframeEndpoint('/board-report')).toBe(false);
    expect(isIronboardEndpoint('/quarantine')).toBe(false);
  });

  it('states zero cross-contamination between applications', () => {
    expect(ZERO_CROSS_CONTAMINATION_DIRECTIVE).toMatch(/IS NOT IRONFRAME/i);
    expect(ZERO_CROSS_CONTAMINATION_DIRECTIVE).toMatch(/ZERO knowledge of sales/i);
    expect(ZERO_CROSS_CONTAMINATION_DIRECTIVE).toMatch(/out-of-band/i);
  });
});

describe('conversationPlaneGateway endpoint routing', () => {
  it('routes registered IronBoard paths to boardroom plane', async () => {
    const { resolveConversationPlane, IRONBOARD_BOARDROOM_PLANE } = await import(
      '../../app/lib/conversationPlaneGateway'
    );
    expect(resolveConversationPlane({ pathname: '/board-report' })).toBe(
      IRONBOARD_BOARDROOM_PLANE,
    );
    expect(resolveConversationPlane({ pathname: '/integrity-audit' })).toBe(
      IRONBOARD_BOARDROOM_PLANE,
    );
  });

  it('routes registered Ironframe paths to GRC plane', async () => {
    const { resolveConversationPlane, IRONFRAME_GRC_PLANE } = await import(
      '../../app/lib/conversationPlaneGateway'
    );
    expect(resolveConversationPlane({ pathname: '/vendors' })).toBe(IRONFRAME_GRC_PLANE);
    expect(resolveConversationPlane({ pathname: '/security-profile' })).toBe(
      IRONFRAME_GRC_PLANE,
    );
  });
});
