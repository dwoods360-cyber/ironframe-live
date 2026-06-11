import { describe, expect, it } from 'vitest';
import { displayIcpScore } from './flywheelScore.js';

describe('displayIcpScore', () => {
  it('returns icpScore from backend payload', () => {
    expect(displayIcpScore({ icpScore: 275 })).toBe(275);
    expect(displayIcpScore({ icpScore: 200 })).toBe(200);
  });

  it('returns 0 when icpScore is absent — never a layout index', () => {
    expect(displayIcpScore({})).toBe(0);
    expect(displayIcpScore({ icpScore: null })).toBe(0);
  });
});
