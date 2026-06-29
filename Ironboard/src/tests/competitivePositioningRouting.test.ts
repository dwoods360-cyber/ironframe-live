import { describe, expect, it } from 'vitest';
import {
  CANONICAL_COMPETITIVE_POSITIONING_RESPONSE,
  resolveCanonicalBoardResponse,
} from '../orchestrator/routing.js';

describe('competitive positioning canonical routing', () => {
  it('returns board-safe competitive copy for market-edge questions', () => {
    const response = resolveCanonicalBoardResponse('Do we have a true market edge?');
    expect(response).toBe(CANONICAL_COMPETITIVE_POSITIONING_RESPONSE);
    expect(response).toContain('quantitative GRC command post');
    expect(response?.toLowerCase()).not.toContain('demonstrably ahead');
    expect(response).toContain('not "ahead of the market"');
    expect(response).toContain('"uncopyable moats."');
  });

  it('does not conflate market research capability queries', () => {
    expect(resolveCanonicalBoardResponse('Are you not able to perform real market research?')).toBe(
      null,
    );
  });
});
